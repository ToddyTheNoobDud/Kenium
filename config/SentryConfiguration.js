const Sentry = require("@sentry/node");
const { Logger, LoggerContext } = require("@sentry/logger");
const { SentryAppender } = require("@sentry/logback");

class SentryConfiguration {
    constructor(sentryConfig) {
        this.sentryConfig = sentryConfig;
        if (sentryConfig.dsn) {
            this.turnOn(sentryConfig.dsn, sentryConfig.tags, sentryConfig.environment);
        } else {
            this.turnOff();
        }
    }

    turnOn(dsn, tags, environment) {
        this.log.info("Turning on sentry");

        // set the git commit hash this was build on as the release
        const gitProps = require("../git.properties");
        const commitHash = gitProps["git.commit.id"];
        Sentry.init({
            dsn: dsn,
            environment: environment,
            release: commitHash ? commitHash : undefined,
            tags: tags,
        });

        this.sentryLogbackAppender.start();
    }

    turnOff() {
        this.log.warn("Turning off sentry");
        Sentry.close();
        this.sentryLogbackAppender.stop();
    }

    get sentryLogbackAppender() {
        // programmatically creates a sentry appender
        const loggerContext = LoggerContext.getInstance();
        const root = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME);

        let sentryAppender = root.getAppender(SentryConfiguration.SENTRY_APPENDER_NAME);
        if (!sentryAppender) {
            sentryAppender = new SentryAppender();
            sentryAppender.name = SentryConfiguration.SENTRY_APPENDER_NAME;
            const warningsOrAboveFilter = new ThresholdFilter();
            warningsOrAboveFilter.setLevel(Logger.WARN.levelStr);
            warningsOrAboveFilter.start();
            sentryAppender.addFilter(warningsOrAboveFilter);
            sentryAppender.context = loggerContext;
            root.addAppender(sentryAppender);
        }

        return sentryAppender;
    }
}

SentryConfiguration.SENTRY_APPENDER_NAME = "SENTRY";

module.exports = SentryConfiguration;

