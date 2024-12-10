const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const { setTimeout: setTimeoutPromise } = require('timers/promises');
const { LoggerFactory } = require('kyokobot-commons');
const { ServerConfig } = require('./config');
const { AudioPlayerManager } = require('./player');
const { KoeClient } = require('kyokobot-koe');
const log = LoggerFactory.getLogger('AudioPlayerConfiguration');

class AudioPlayerConfiguration {
    constructor(sources, serverConfig, routePlanner, audioSourceManagers, audioPlayerManagerConfigurations, mediaContainerProbes) {
        this.audioPlayerManager = new AudioPlayerManager();

        if (serverConfig.isGcWarnings) {
            this.audioPlayerManager.enableGcMonitoring();
        }

        if (serverConfig.isNonAllocatingFrameBuffer) {
            log.info('Using a non-allocating frame buffer');
            this.audioPlayerManager.configuration.setFrameBufferFactory(() => new NonAllocatingAudioFrameBuffer());
        }

        const defaultFrameBufferDuration = this.audioPlayerManager.frameBufferDuration;
        serverConfig.frameBufferDurationMs = serverConfig.frameBufferDurationMs || defaultFrameBufferDuration;
        log.debug(`Setting frame buffer duration to ${serverConfig.frameBufferDurationMs}ms`);
        this.audioPlayerManager.frameBufferDuration = serverConfig.frameBufferDurationMs;

        const defaultOpusEncodingQuality = AudioConfiguration.OPUS_QUALITY_MAX;
        serverConfig.opusEncodingQuality = serverConfig.opusEncodingQuality || defaultOpusEncodingQuality;
        log.debug(`Setting opusEncodingQuality to ${serverConfig.opusEncodingQuality}`);
        this.audioPlayerManager.configuration.opusEncodingQuality = serverConfig.opusEncodingQuality;

        serverConfig.resamplingQuality = serverConfig.resamplingQuality || 1;
        log.debug(`Setting resamplingQuality to ${serverConfig.resamplingQuality}`);
        this.audioPlayerManager.configuration.resamplingQuality = serverConfig.resamplingQuality;

        const defaultTrackStuckThresholdMs = TimeUnit.NANOSECONDS.toMillis(this.audioPlayerManager.trackStuckThresholdNanos);
        serverConfig.trackStuckThresholdMs = serverConfig.trackStuckThresholdMs || defaultTrackStuckThresholdMs;
        log.debug(`Setting Track Stuck Threshold to ${serverConfig.trackStuckThresholdMs}ms`);
        this.audioPlayerManager.setTrackStuckThreshold(serverConfig.trackStuckThresholdMs);

        serverConfig.useSeekGhosting = serverConfig.useSeekGhosting || false;
        log.debug(`Setting useSeekGhosting to ${serverConfig.useSeekGhosting}`);
        this.audioPlayerManager.setUseSeekGhosting(serverConfig.useSeekGhosting);

        const mcr = new MediaContainerRegistry(...mediaContainerProbes);

        if (sources.isYoutube) {
            log.warn(`
                The default Youtube source is now deprecated and won't receive further updates.
                You should use the new Youtube source plugin instead.
                https://github.com/lavalink-devs/youtube-source#plugin.
                To disable this warning, set 'lavalink.server.sources.youtube' to false in your application.yml.
            `);
            const youtubeConfig = serverConfig.youtubeConfig;
            const youtube = new YoutubeAudioSourceManager(
                serverConfig.isYoutubeSearchEnabled,
                youtubeConfig.email,
                youtubeConfig.password
            );
            if (routePlanner != null) {
                const retryLimit = serverConfig.ratelimit?.retryLimit || -1;
                switch (retryLimit) {
                    case -1:
                        YoutubeIpRotatorSetup(routePlanner).forSource(youtube).setup();
                        break;
                    case 0:
                        YoutubeIpRotatorSetup(routePlanner).forSource(youtube).withRetryLimit(Integer.MAX_VALUE).setup();
                        break;
                    default:
                        YoutubeIpRotatorSetup(routePlanner).forSource(youtube).withRetryLimit(retryLimit).setup();
                }
            }

            const playlistLoadLimit = serverConfig.youtubePlaylistLoadLimit;
            if (playlistLoadLimit != null) youtube.setPlaylistPageCount(playlistLoadLimit);

            this.audioPlayerManager.registerSourceManager(youtube);
        }
        if (sources.isSoundcloud) {
            const dataReader = new DefaultSoundCloudDataReader();
            const dataLoader = new DefaultSoundCloudDataLoader();
            const formatHandler = new DefaultSoundCloudFormatHandler();

            this.audioPlayerManager.registerSourceManager(
                new SoundCloudAudioSourceManager(
                    serverConfig.isSoundcloudSearchEnabled,
                    dataReader,
                    dataLoader,
                    formatHandler,
                    new DefaultSoundCloudPlaylistLoader(dataLoader, dataReader, formatHandler)
                )
            );
        }
        if (sources.isBandcamp) this.audioPlayerManager.registerSourceManager(new BandcampAudioSourceManager());
        if (sources.isTwitch) this.audioPlayerManager.registerSourceManager(new TwitchStreamAudioSourceManager());
        if (sources.isVimeo) this.audioPlayerManager.registerSourceManager(new VimeoAudioSourceManager());
        if (sources.isNico) this.audioPlayerManager.registerSourceManager(new NicoAudioSourceManager());
        if (sources.isLocal) this.audioPlayerManager.registerSourceManager(new LocalAudioSourceManager(mcr));

        audioSourceManagers.forEach((manager) => {
            this.audioPlayerManager.registerSourceManager(manager);
            log.info(`Registered ${manager} provided from a plugin`);
        });

        this.audioPlayerManager.configuration.isFilterHotSwapEnabled = true;

        const am = audioPlayerManagerConfigurations
            .reduce((player, plugin) => plugin.configure(player), this.audioPlayerManager);

        // This must be loaded last
        if (sources.isHttp) {
            const httpAudioSourceManager = new HttpAudioSourceManager(mcr);

            serverConfig.httpConfig = serverConfig.httpConfig || {};
            if (serverConfig.httpConfig.proxyHost) {
                const credsProvider = new BasicCredentialsProvider();
                credsProvider.setCredentials(
                    new AuthScope(serverConfig.httpConfig.proxyHost, serverConfig.httpConfig.proxyPort),
                    new UsernamePasswordCredentials(serverConfig.httpConfig.proxyUser, serverConfig.httpConfig.proxyPassword)
                );

                httpAudioSourceManager.configureBuilder((builder) => {
                    builder.setProxy(new HttpHost(serverConfig.httpConfig.proxyHost, serverConfig.httpConfig.proxyPort));
                    if (serverConfig.httpConfig.proxyUser) {
                        builder.setDefaultCredentialsProvider(credsProvider);
                    }
                });
            }

            this.audioPlayerManager.registerSourceManager(httpAudioSourceManager);
        }

        return am;
    }

    static routePlanner(serverConfig) {
        const rateLimitConfig = serverConfig.ratelimit;
        if (!rateLimitConfig) {
            log.debug('No rate limit config block found, skipping setup of route planner');
            return null;
        }
        const ipBlockList = rateLimitConfig.ipBlocks;
        if (ipBlockList.length === 0) {
            log.info('List of ip blocks is empty, skipping setup of route planner');
            return null;
        }

        const blacklisted = rateLimitConfig.excludedIps.map((ip) => InetAddress.getByName(ip));
        const filter = (ip) => !blacklisted.includes(ip);
        const ipBlocks = ipBlockList.map((block) => {
            if (Ipv4Block.isIpv4CidrBlock(block)) {
                return new Ipv4Block(block);
            } else if (Ipv6Block.isIpv6CidrBlock(block)) {
                return new Ipv6Block(block);
            } else {
                throw new Error(`Invalid IP Block '${block}', make sure to provide a valid CIDR notation`);
            }
        });

        switch (rateLimitConfig.strategy.toLowerCase().trim()) {
            case 'rotateonban':
                return new RotatingIpRoutePlanner(ipBlocks, filter, rateLimitConfig.searchTriggersFail);
            case 'loadbalance':
                return new BalancingIpRoutePlanner(ipBlocks, filter, rateLimitConfig.searchTriggersFail);
            case 'nanoswitch':
                return new NanoIpRoutePlanner(ipBlocks, rateLimitConfig.searchTriggersFail);
            case 'rotatingnanoswitch':
                return new RotatingNanoIpRoutePlanner(ipBlocks, filter, rateLimitConfig.searchTriggersFail);
            default:
                throw new Error('Unknown strategy!');
        }
    }
}

module.exports = AudioPlayerConfiguration;

