const RequestLoggingFilter = require('../io/RequestLoggingFilter')

module.exports = {
    includeClientInfo: false,
    includeHeaders: false,
    includeQueryString: true,
    includePayload: true,
    maxPayloadLength: 10000,
    logFilter: function() { return new RequestLoggingFilter(this) }
}
