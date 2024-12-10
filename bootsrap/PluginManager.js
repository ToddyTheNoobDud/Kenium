const fs = require('fs');
const path = require('path');
const axios = require('axios');
const JSZip = require('jszip');
const { promisify } = require('util');

class PluginManager {
    constructor(config) {
        this.config = config;
        this.pluginManifests = [];
        this.pluginsDir =   path.join(__dirname, '..', 'plugins') || config.pluginsDir

        this.init();
    }

    async init() {
        if (!this.config || !this.config.plugins) return;
        await this.manageDownloads();
        this.pluginManifests.push(...await this.readClasspathManifests());
        this.pluginManifests.push(...await this.loadJars());
    }

    async manageDownloads() {
        if (!this.config.plugins || this.config.plugins.length === 0) return;

        const directory = this.createDirectory(this.pluginsDir);
        const pluginJars = await this.getPluginJars(directory);

        const declarations = this.config.plugins.map(declaration => {
            const dep = declaration.dependency;
            if (dep) {
                const fragments = dep.split(':');
                if (fragments.length !== 3) throw new Error(`Invalid dependency "${dep}"`);
                const repository = declaration.repository || this.config.defaultPluginRepository;
                return {
                    group: fragments[0],
                    name: fragments[1],
                    version: fragments[2],
                    repository: repository.replace(/\/$/, '') + '/',
                };
            }
            return null;
        }).filter(Boolean);

        const uniqueDeclarations = Array.from(new Set(declarations.map(d => `${d.group}:${d.name}`)))
        
        for (const declaration of uniqueDeclarations) {
            const jars = pluginJars.filter(jar => jar.manifest.name === declaration.name);
            const hasCurrentVersion = jars.some(jar => jar.manifest.version === declaration.version);

            for (const jar of jars) {
                if (jar.manifest.version !== declaration.version) {
                    fs.unlinkSync(jar.file);
                    console.info(`Deleted ${jar.file} (new version: ${declaration.version})`);
                }
            }

            if (!hasCurrentVersion) {
                await this.downloadJar(path.join(directory, declaration.canonicalJarName), declaration.url);
            }
        }
    }

    async downloadJar(output, url) {
        console.info(`Downloading ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        fs.writeFileSync(output, response.data);
    }

    async readClasspathManifests() {
        const manifests = [];
        const files = fs.readdirSync(this.pluginsDir).filter(file => file.endsWith('.properties'));
        
        for (const file of files) {
            const manifest = await this.parsePluginManifest(path.join(this.pluginsDir, file));
            if (manifest) {
                manifests.push(manifest);
                console.info(`Found plugin '${manifest.name}' version ${manifest.version}`);
            }
        }
        return manifests;
    }

    async loadJars() {
        const directory = this.pluginsDir;
        if (!fs.existsSync(directory)) return [];

        const jarsToLoad = fs.readdirSync(directory).filter(file => file.endsWith('.jar'));
        const manifests = [];

        for (const jarFile of jarsToLoad) {
            const filePath = path.join(directory, jarFile);
            const manifest = await this.loadJar(filePath);
            manifests.push(...manifest);
        }
        return manifests;
    }

    async loadJar(file) {
        const zip = new JSZip();
        const data = fs.readFileSync(file);
        await zip.loadAsync(data);

        const manifests = await this.loadPluginManifests(zip);
        if (manifests.length === 0) throw new Error(`No plugin manifest found in ${file}`);

        console.info(`Loaded ${path.basename(file)} (${manifests.length} classes)`);
        return manifests;
    }

    async loadPluginManifests(zip) {
        const manifests = [];
        for (const fileName of Object.keys(zip.files)) {
            if (fileName.endsWith('.properties') && fileName.startsWith('lavalink-plugins/')) {
                const stream = await zip.file(fileName).async('string');
                const manifest = await this.parsePluginManifest(stream);
                if (manifest) {
                    manifests.push(manifest);
                }
            }
        }
        return manifests;
    }

    async parsePluginManifest(stream) {
        const props = {};
        stream.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                props[key.trim()] = value.trim();
            }
        });

        const name = props['name'];
        const path = props['path'];
        const version = props['version'];
        if (!name || !path || !version) return null;

        return { name, path, version };
    }

    createDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    async getPluginJars(directory) {
        const files = fs.readdirSync(directory);
        return files.filter(file => file.endsWith('.jar')).map(file => ({
            manifest: { name: file.replace('.jar', ''), version: 'unknown' }, // Placeholder for manifest
            file: path.join(directory, file)
        }));
    }
}

module.exports = {PluginManager};

