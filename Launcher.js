const express = require('express');
const { PluginManager } = require('./bootsrap/PluginManager.js');
const { AppInfo } = require('./info/AppInfo.js');
const { GitRepoState } = require('./info/GitRepoState.js');
const log4js = require("log4js");
const { Instant, ZoneId, LocalDateTime } = require('@js-joda/core');

class LavalinkApplication {}

const Launcher = {
    log: log4js.getLogger(),
    startTime: Date.now(),
    io: (() => {
        const fs = require('fs');
        const path = require('path');
        const ioDir = path.join(__dirname, 'io');
        const files = fs.readdirSync(ioDir);
        const modules = {};
        files.forEach(file => {
            const moduleName = path.basename(file, '.js');
            modules[moduleName] = require(path.join(ioDir, file));
        });
        return modules;
    })(),

    getVersionInfo(indentation = "\t", vanity = true) {
        console.log("Generating version info...");
        const gitRepoState = new GitRepoState();

        let infoString = '';
        if (vanity) {
            infoString += this.getVanity() + '\n';
        }
        if (!gitRepoState.isLoaded) {
            infoString += `${indentation}*** Unable to find or load Git metadata ***\n`;
        }
        if (gitRepoState.isLoaded) {
            infoString += `${indentation}Branch:         ${gitRepoState.branch}\n`;
            infoString += `${indentation}Commit:         ${gitRepoState.commitIdAbbrev}\n`;
        }
        infoString += `${indentation}Node.js:       ${process.version}\n`;
        return infoString;
    },

    getVanity() {
        console.log("Generating vanity art...");
        const red = "\x1b[31m";  // ANSI color codes
        const green = "\x1b[32m";
        const defaultC = "\x1b[0m";
        let vanity = 
            "g       .  r _                  _ _       _    g__ _ _\n" +
            "g      /\\\\ r| | __ ___   ____ _| (_)_ __ | | __g\\ \\ \\ \\\n" +
            "g     ( ( )r| |/ _` \\ \\ / / _` | | | '_ \\| |/ /g \\ \\ \\ \\\n" +
            "g      \\\\/ r| | (_| |\\ V / (_| | | | | | |   < g  ) ) ) )\n" +
            "g       '  r|_|\\__,_| \\_/ \\__,_|_|_|_| |_|_|\\_\\g / / / /\n" +
            "d    =========================================g/_/_/_/d";
        vanity = vanity.replace(/r/g, red).replace(/g/g, green).replace(/d/g, defaultC);
        return vanity;
    },

    main(args) {
        console.log("Starting main function...");
        if (args.length > 0 && (args[0].toLowerCase() === '-v' || args[0].toLowerCase() === '--version')) {
            console.log(this.getVersionInfo("", false));
            return;
        }
        const parent = this.launchPluginBootstrap();
        this.launchMain(parent, args);
    },

    /**
     * Starts the plugin manager and returns the initialized instance
     *
     * The plugin manager is responsible for loading and enabling plugins
     *
     * @returns {PluginManager} The initialized plugin manager
     */
    launchPluginBootstrap() {
        console.log("Initializing Plugin Manager...");
        const pluginManager = new PluginManager();
        pluginManager.init(); // Assuming start method initializes the plugin manager
        console.log("Plugin Manager initialized.");
        return pluginManager; // Return the initialized plugin manager
    },

    launchMain(parent, args) {
        console.log("Launching main application...");
        const app = express();
        const pluginManager = parent; // Use the instance of PluginManager
        const properties = {
            componentScan: pluginManager.pluginManifests.map(manifest => manifest.path).concat('lavalink.server')
        };

        // Set up application routes, middleware, etc.
        app.get('/', (req, res) => {
            res.send('Lavalink Application is running!');
        });

        // Start the server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            this.log.info(this.getVersionInfo());
            this.log.info("Lavalink is ready to accept connections on port " + PORT);
        });
        console.log("Application started on port " + PORT);
    }
};

// Export the application and launcher
module.exports = { LavalinkApplication, Launcher };

// Entry point
if (require.main === module) {
    console.log("Application entry point...");
    const args = process.argv.slice(2);
    Launcher.main(args);
    console.log("Application execution finished.");
}

