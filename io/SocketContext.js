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
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERC
 */

const EventEmitter = require('events')
class SocketContext {
    constructor(sessionId, userId, clientName, koe, serverConfig, audioPlayerManager, statsCollector, eventHandlers, pluginInfoModifiers) {
        this.sessionId = sessionId
        this.userId = userId
        this.clientName = clientName
        this.koe = koe
        this.serverConfig = serverConfig
        this.audioPlayerManager = audioPlayerManager
        this.statsCollector = statsCollector
        this.eventEmitter = new EventEmitter()
        eventHandlers.forEach(handler => this.eventEmitter.on('any', handler))
        this.koe.on('connection', this.onKoeConnection.bind(this))
    }

    async getPlayer(guildId) {
        const player = this.players.get(guildId)
        if (player) return player

        const newPlayer = new LavalinkPlayer(this, guildId, this.serverConfig, this.audioPlayerManager, this.pluginInfoModifiers)
        this.players.set(guildId, newPlayer)
        this.eventEmitter.emit('newPlayer', newPlayer)
        return newPlayer
    }

    getMediaConnection(player) {
        const guildId = player.guildId
        let connection = this.koe.getConnection(guildId)
        if (!connection) {
            connection = this.koe.createConnection(guildId)
            connection.registerListener(new WsEventHandler(player))
        }
        return connection
    }

    destroyPlayer(guildId) {
        const player = this.players.get(guildId)
        if (!player) return

        this.players.delete(guildId)
        this.eventEmitter.emit('destroyPlayer', player)
        player.destroy()
        this.koe.destroyConnection(guildId)
    }

    pause() {
        this.resumable = true
        this.sessionTimeoutFuture = setTimeout(() => {
            this.socketServer.onSessionResumeTimeout(this)
        }, this.resumeTimeout * 1000)
        this.eventEmitter.emit('pause')
    }

    resume(session) {
        this.resumable = false
        this.session = session
        this.sendMessage({ type: 'ready', ready: true, sessionId: this.sessionId })
        this.log.emit('replaying', this.resumeEventQueue.length)

        // Bulk actions are not guaranteed to be atomic, so we need to do this imperatively
        while (this.resumeEventQueue.length > 0) {
            const message = this.resumeEventQueue.shift()
            this.sendMessage(message)
        }

        this.players.values().forEach(player => SocketServer.sendPlayerUpdate(this, player))
    }

    sendMessage(message) {
        this.eventEmitter.emit('sendMessage', message)
        const json = json.serialize(message)
        if (!this.session) return
        this.session.send(json)
    }

    onKoeConnection(connection) {
        connection.on('close', () => {
            this.eventEmitter.emit('gatewayClosed', connection.target, 1000, 'Koe connection closed')
        })
    }

    static WsEventHandler = class WsEventHandler extends EventEmitter {
        constructor(player) {
            super()

            this.player = player
        }

        gatewayClosed(code, reason, byRemote) {
            const event = {
                type: 'playerUpdate',
                guildId: this.player.guildId.toString(),
                state: {
                    connection: false,
                    code,
                    reason: reason ?? '',
                    byRemote
                }
            }

            this.player.socketContext.sendMessage(event)
            SocketServer.sendPlayerUpdate(this.player.socketContext, this.player)
        }

        gatewayReady(target, ssrc) {
            SocketServer.sendPlayerUpdate(this.player.socketContext, this.player)
        }

        gatewayError(cause) {
            this.player.socketContext.log.error(`Koe encountered a voice gateway exception for guild ${this.player.guildId}`, cause)
        }
    }
}

module.exports = {SocketContext}
