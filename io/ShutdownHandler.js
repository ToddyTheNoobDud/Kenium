const { WebSocket } = require('ws');
const { CloseStatus } = require('ws');

class ShutdownHandler {
    constructor(socketServer) {
        this.socketServer = socketServer;
    }

    run() {
        this.socketServer.contexts.forEach((context) => {
            try {
                context.runCatching(() => context.closeWebSocket(CloseStatus.GOING_AWAY));
            } catch (e) { /* ignore */ }
        });
    }
}

