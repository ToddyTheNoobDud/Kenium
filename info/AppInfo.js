const fs = require('fs');
const properties = require('properties');
const path = require('path');

/**
 * Created by napster on 25.06.18.
 *
 * Requires app.properties to be populated with values during the gradle build
 */
class AppInfo {
    async versionBuild() {
        return AppInfo._properties.version;
    }

    async groupId() {
        return AppInfo._properties.groupId;
    }

    async artifactId() {
        return AppInfo._properties.artifactId;
    }

     async buildTime() {
        return AppInfo._properties.buildTime || -1;
    }

    static get _properties() {
        if (!AppInfo._propertiesObject) {
            const resourceAsStream = fs.readFileSync(path.join(__dirname, '..', '..', 'app.properties'));
            const prop = properties.parse(resourceAsStream.toString());
            AppInfo._propertiesObject = prop;
        }
        return AppInfo._propertiesObject;
    }
    static _propertiesObject = {};
}

module.exports = {AppInfo};