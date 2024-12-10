const { HttpStatus } = require('http-status-codes');
const { LoggerFactory } = require('some-logger'); // replace 'some-logger' with the actual logger you use
const ServerConfig = require('./ServerConfig');
const MetricsPrometheusConfigProperties = require('./MetricsPrometheusConfigProperties');

class RequestAuthorizationFilter {
    constructor(serverConfig, metricsConfig) {
        this.serverConfig = serverConfig;
        this.metricsConfig = metricsConfig;
        this.log = LoggerFactory.getLogger(RequestAuthorizationFilter.name);
    }

    preHandle(req, res, next) {
        if (this.metricsConfig.endpoint && req.path === this.metricsConfig.endpoint) {
            return next();
        }

        if (req.path === '/error') {
            return next();
        }

        const authorization = req.get('Authorization');
        const path = req.originalUrl.substring(req.baseUrl.length);

        if (!authorization || authorization !== this.serverConfig.password) {
            if (!authorization) {
                this.log.warn(`Authorization missing for ${req.ip} on ${req.method} ${path}`);
                res.status(HttpStatus.UNAUTHORIZED).send();
                return;
            }

            this.log.warn(`Authorization failed for ${req.ip} on ${req.method} ${path}`);
            res.status(HttpStatus.FORBIDDEN).send();
            return;
        }

        next();
    }

    addInterceptors(app) {
        app.use((req, res, next) => this.preHandle(req, res, next));
    }
}

module.exports = RequestAuthorizationFilter;

