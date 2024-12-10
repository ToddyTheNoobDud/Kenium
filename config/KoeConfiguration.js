const { GatewayVersion } = require('kyokobot-koe');
const { UdpQueueFramePollerFactory } = require('kyokobot-koe/lib/codec/udpqueue');
const { SystemType, DefaultArchitectureTypes, DefaultOperatingSystemTypes } = require('kyokobot-koe/lib/natives/architecture');
const log4js = require('log4js');
const { v4: uuidv4 } = require('uuid');

const log = log4js.getLogger('KoeConfiguration');

class KoeConfiguration {
    constructor(serverConfig) {
        this.serverConfig = serverConfig;
        this.supportedSystems = [
            new SystemType(DefaultArchitectureTypes.ARM, DefaultOperatingSystemTypes.LINUX),
            new SystemType(DefaultArchitectureTypes.X86_64, DefaultOperatingSystemTypes.LINUX),
            new SystemType(DefaultArchitectureTypes.X86_32, DefaultOperatingSystemTypes.LINUX),
            new SystemType(DefaultArchitectureTypes.ARMv8_64, DefaultOperatingSystemTypes.LINUX),

            new SystemType(DefaultArchitectureTypes.X86_64, DefaultOperatingSystemTypes.LINUX_MUSL),
            new SystemType(DefaultArchitectureTypes.ARMv8_64, DefaultOperatingSystemTypes.LINUX_MUSL),

            new SystemType(DefaultArchitectureTypes.X86_64, DefaultOperatingSystemTypes.WINDOWS),
            new SystemType(DefaultArchitectureTypes.X86_32, DefaultOperatingSystemTypes.WINDOWS),

            new SystemType(DefaultArchitectureTypes.X86_64, DefaultOperatingSystemTypes.DARWIN),
            new SystemType(DefaultArchitectureTypes.ARMv8_64, DefaultOperatingSystemTypes.DARWIN)
        ];
    }

    getKoeOptions() {
        const koeOptions = new KoeOptions.Builder()
            .setGatewayVersion(GatewayVersion.V8)
            .build();
        const systemType = this.detectSystemType();
        log.info(`OS: ${systemType?.osType}, Arch: ${systemType?.architectureType}`);
        let bufferSize = this.serverConfig.bufferDurationMs || UdpQueueFramePollerFactory.DEFAULT_BUFFER_DURATION;
        if (bufferSize <= 0) {
            log.info('JDA-NAS is disabled! GC pauses may cause your bot to stutter during playback.');
            return koeOptions;
        }

        const nasSupported = this.supportedSystems.some((system) => system.osType === systemType?.osType && system.architectureType === systemType?.architectureType);
        if (nasSupported) {
            log.info('Enabling JDA-NAS');
            if (bufferSize < 40) {
                log.warn(`Buffer size of ${bufferSize}ms is illegal. Defaulting to ${UdpQueueFramePollerFactory.DEFAULT_BUFFER_DURATION}ms`);
                bufferSize = UdpQueueFramePollerFactory.DEFAULT_BUFFER_DURATION;
            }
            try {
                koeOptions.setFramePollerFactory(new UdpQueueFramePollerFactory(bufferSize, require('os').cpus().length));
            } catch (e) {
                log.warn('Failed to enable JDA-NAS! GC pauses may cause your bot to stutter during playback.', e);
            }
        } else {
            log.warn('This system and architecture appears to not support native audio sending! GC pauses may cause your bot to stutter during playback.');
        }
        return koeOptions;
    }

    detectSystemType() {
        try {
            return new SystemType(DefaultArchitectureTypes.detect(), DefaultOperatingSystemTypes.detect());
        } catch (e) {
            return null;
        }
    }
}

module.exports = KoeConfiguration;

