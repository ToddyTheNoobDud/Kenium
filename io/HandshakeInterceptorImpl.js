
class HandshakeInterceptorImpl {
    constructor(config, server) {
        this.config = config;
        this.server = server;
    }

    beforeHandshake(request, response, wsHandler, attributes) {
        const password = request.headers['authorization'];

        if (password !== this.config.password) {
            console.error(`Authentication failed from ${request.connection.remoteAddress}`);
            response.statusCode = 401;
            return false;
        }

        const userId = request.headers['user-id'];
        if (!userId || Number(userId) === 0) {
            console.error(`Missing User-Id header from ${request.connection.remoteAddress}`);
            response.statusCode = 400;
            return false;
        }

        console.info(`Incoming connection from ${request.connection.remoteAddress}`);

        const sessionId = request.headers['session-id'];
        const resuming = sessionId && this.server.canResume(sessionId);

        response.setHeader('Session-Resumed', resuming.toString());

        return true;
    }

    afterHandshake(request, response, wsHandler, exception) {
    }
}

module.exports = HandshakeInterceptorImpl;

