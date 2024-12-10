const fs = require('fs');
const path = require('path');
const Properties = require('properties');

class GitRepoState {
    constructor() {
        this.log = require('log4js').getLogger('GitRepoState');

        this.isLoaded = false;
        this.branch = '';
        this.commitId = '';
        this.commitIdAbbrev = '';
        this.commitUserName = '';
        this.commitUserEmail = '';
        this.commitMessageFull = '';
        this.commitMessageShort = '';
        this.commitTime = 0;

        this.loadProperties();
    }

    loadProperties() {
        try {
            const propertiesPath = path.join(__dirname, 'git.properties');
            const propertiesContent = fs.readFileSync(propertiesPath, 'utf8');
            const properties = Properties.parse(propertiesContent);

            this.isLoaded = true;
            this.branch = properties['git.branch'] || '';
            this.commitId = properties['git.commit.id'] || '';
            this.commitIdAbbrev = properties['git.commit.id.abbrev'] || '';
            this.commitUserName = properties['git.commit.user.name'] || '';
            this.commitUserEmail = properties['git.commit.user.email'] || '';
            this.commitMessageFull = properties['git.commit.message.full'] || '';
            this.commitMessageShort = properties['git.commit.message.short'] || '';

            const time = properties['git.commit.time'];
            if (time && time !== 'null') {
                const dtf = require('js-joda').DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
                const OffsetDateTime = require('js-joda').OffsetDateTime;
                this.commitTime = OffsetDateTime.parse(time, dtf).toEpochSecond();
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                this.log.trace("Failed to load git repo information. Did you build with the git gradle plugin? Is the git.properties file present?");
            } else {
                this.log.info("Failed to load git repo information due to suspicious IOException", e);
            }
        }
    }
}

module.exports = {GitRepoState};
