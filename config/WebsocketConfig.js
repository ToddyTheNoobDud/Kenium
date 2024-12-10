const express = require('express');
const WebSocket = require('ws');
const HandshakeInterceptorImpl = require('./io/HandshakeInterceptorImpl');
const SocketServer = require('./io/SocketServer');
const { Logger } = require('log4js');

const app = express();
const log = Logger.getLogger('WebsocketConfig');

const server = new SocketServer();
const handshakeInterceptor = new HandshakeInterceptorImpl();

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    server.onConnectionEstablished(ws);
});

app.get(['/', '/v3/websocket'], (req, res) => {
    log.warn("This is the old Lavalink websocket endpoint. Please use /v4/websocket instead. If you are using a client library, please update it to a Lavalink v4 compatible version or use Lavalink v3 instead.");
    res.sendStatus(410);
});

app.on('upgrade', (request, socket, head) => {
    handshakeInterceptor.intercept(request, socket, head, (err) => {
        if (err) {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    log.info(`Server is running on port ${PORT}`);
});

