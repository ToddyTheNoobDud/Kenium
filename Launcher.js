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
        let infoString = '';
        if (vanity) {
            infoString += this.getVanity() + '\n';
        }
        infoString += `${indentation}Node.js:       ${process.version}\n`;
        return infoString;
    },
    getVanity() {
        let vanity = 
            "g       .  r _                  _ _       _    g__ _ _\n" +
            "g      /\\\\ r| | __ ___   ____ _| (_)_ __ | | __g\\ \\ \\ \\\n" +
            "g     ( ( )r| |/ _` \\ \\ / / _` | | | '_ \\| |/ /g \\ \\ \\ \\\n" +
            "g      \\/ r| | (_| |\\ V / (_| | | | | | |   < g  ) ) ) )\n" +
            "g       '  r|_|\\__,_| \\_/ \\__,_|_|_|_| |_|_|\\_\\g / / / /\n" +
            "d    =========================================g/_/_/_/d";
        vanity = vanity.replace(/r/g, "\x1b[31m").replace(/g/g, "\x1b[32m").replace(/d/g, "\x1b[0m");
        return vanity;
    },
    main: async function(args) {
        console.log("Starting main function...");
        if (args.length > 0 && (args[0].toLowerCase() === '-v' || args[0].toLowerCase() === '--version')) {
            console.log(this.getVersionInfo("", false));
            return;
        }
        const parent = await this.launchPluginBootstrap();
        await this.launchMain(parent, args);
    },
    /**
     * Starts the plugin manager and returns the initialized instance
     *
     * The plugin manager is responsible for loading and enabling plugins
     *
     * @returns {PluginManager} The initialized plugin manager
     */
    async launchPluginBootstrap() {
        console.log("Initializing Plugin Manager...");
        const pluginManager = new PluginManager();
        await pluginManager.init(); // Make sure this is awaited if it returns a promise
        console.log("Plugin Manager initialized.");
        return pluginManager;
    },
    async launchMain(parent, args) {
        console.log("Launching main application...");
        const app = express();
        // Set up application routes, middleware, etc.
        app.get('/', (req, res) => {
            res.send('Lavalink Application is running!');
        });
        // Start the server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, (err) => {
            if (err) {
                this.log.error("Error starting server: ", err);
                return;
            }
            this.log.info(this.getVersionInfo());
            this.log.info("Lavalink is ready to accept connections on port " + PORT);
        });
        // Remove the blocking promise
        console.log("Application started on port " + PORT);
    }
};

// Export the application and launcher
module.exports = { LavalinkApplication, Launcher };

// Entry point
if (require.main === module) {
    console.log("Application entry point...");
    const args = process.argv.slice(2);
    Launcher.main(args)
        .then(() => {
            console.log("Application execution finished.");
        })
        .catch(err => {
            console.error("Error during application execution:", err);
        });
}
