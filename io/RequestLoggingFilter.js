const { AbstractRequestLoggingFilter } = require('express-request-logger');
const { LoggerFactory } = require('log4js');

class RequestLoggingFilter extends (AbstractRequestLoggingFilter !== undefined ? AbstractRequestLoggingFilter : Object) {
    constructor(requestLoggingConfig) {
        super();
        this.log = LoggerFactory.getLogger('RequestLoggingFilter');

        this.includeClientInfo = requestLoggingConfig.includeClientInfo;
        this.includeHeaders = requestLoggingConfig.includeHeaders;
        this.includeQueryString = requestLoggingConfig.includeQueryString;
        this.includePayload = requestLoggingConfig.includePayload;
        this.maxPayloadLength = requestLoggingConfig.maxPayloadLength;
        this.afterMessagePrefix = '';
        this.afterMessageSuffix = '';
    }

    beforeRequest(req, message) {
        // Implement any logic if needed before the request
    }

    afterRequest(req, message) {
        this.log.info(message);
    }
}

module.exports = RequestLoggingFilter;

