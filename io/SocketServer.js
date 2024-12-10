/*
 * Copyright (c) 2021 Freya Arbjerg and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const { setTimeout: setTimeoutPromise } = require('timers/promises');

const { StatsCollector } = require('./StatsCollector.js');
const { SocketContext } = require('./SocketContext.js');

class SocketServer {
    constructor(serverConfig, eventHandlers, pluginInfoModifiers) {
        this.serverConfig = serverConfig;
        this.eventHandlers = eventHandlers;
        this.pluginInfoModifiers = pluginInfoModifiers;

        this.sessions = new Map();
        this.resumableSessions = new Map();
        this.statsCollector = new StatsCollector(this);
        this.charPool = [...'abcdefghijklmnopqrstuvwxyz', ...'0123456789'];

        process.on('exit', () => {
            this.shutdown();
        });
    }

    generateUniqueSessionId() {
        let sessionId;
        do {
            sessionId = Array(16)
                .fill('')
                .map(() => this.charPool[Math.floor(Math.random() * this.charPool.length)])
                .join('');
        } while (this.sessions.has(sessionId));

        return sessionId;
    }

    get contexts() {
        return Array.from(this.sessions.values);
    }

    async onConnectionEstablished(ws, req) {
        const userId = req.headers['user-id'];
        const sessionId = req.headers['session-id'];
        const clientName = req.headers['client-name'];
        const userAgent = req.headers['user-agent'];

        let resumable;
        if (sessionId) {
            resumable = this.resumableSessions.get(sessionId);

            if (resumable) {
                this.sessions.set(resumable.sessionId, resumable);
                resumable.resume(ws);
                console.info(`Resumed session with id ${sessionId}`);
                resumable.eventEmitter.onWebSocketOpen(true);
                return;
            }
        }

        sessionId = this.generateUniqueSessionId();
        ws.sessionId = sessionId;

        const socketContext = new SocketContext(
            sessionId,
            this.serverConfig,
            ws,
            this,
            this.statsCollector,
            userId,
            clientName,
            this.eventHandlers,
            this.pluginInfoModifiers
        );
        this.sessions.set(sessionId, socketContext);
        socketContext.sendMessage(new this.TextMessage(this.ReadyEvent(false, sessionId)));
        socketContext.eventEmitter.onWebSocketOpen(false);
        if (clientName) {
            console.info(`Connection successfully established from ${clientName}`);
            return;
        }

        console.info('Connection successfully established');
        if (userAgent) {
            console.warn(
                `Library developers: Please specify a 'Client-Name' header. User agent: ${userAgent}`
            );
        } else {
            console.warn('Library developers: Please specify a \'Client-Name\' header.');
        }
    }

    async onConnectionClosed(ws, code, reason) {
        const context = this.sessions.get(ws.sessionId);
        if (!context) return;

        if (context.resumable) {
            const removed = this.resumableSessions.get(context.sessionId);
            if (removed) {
                console.warn(
                    `Shutdown resumable session with id ${removed.sessionId} because it has the same id as a ` +
                        'newly disconnected resumable session.'
                );
                removed.shutdown();
            }

            this.resumableSessions.set(context.sessionId, context);
            context.pause();
            console.info(
                `Connection closed from ${ws._socket.remoteAddress} with status ${code} -- ` +
                    `Session can be resumed within the next ${context.resumeTimeout} seconds with id ${context.sessionId}`,
            );
            return;
        }

        console.info(`Connection closed from ${ws._socket.remoteAddress} with id ${context.sessionId} -- ${code}`);
        context.shutdown();
    }

    async onSessionResumeTimeout(context) {
        this.resumableSessions.delete(context.sessionId);
        context.shutdown();
    }

    canResume(id) {
        return this.resumableSessions.has(id) && this.resumableSessions.get(id).stopResumeTimeout();
    }

    shutdown() {
        this.sessions.forEach((context) => context.shutdown());
        this.resumableSessions.forEach((context) => context.shutdown());
    }
}

module.exports = {SocketServer};

