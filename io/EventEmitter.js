const { EventEmitter: BaseEventEmitter } = require('events');
const { forEach } = require('lodash');

class EventEmitter extends BaseEventEmitter {
    constructor(context, listeners) {
        super();
        this.context = context;
        this.listeners = listeners;
    }

    onWebSocketOpen(resumed) {
        return this._iterate((listener) => listener.onWebSocketOpen(this.context, resumed));
    }

    onSocketContextPaused() {
        return this._iterate((listener) => listener.onSocketContextPaused(this.context));
    }

    onSocketContextDestroyed() {
        return this._iterate((listener) => listener.onSocketContextDestroyed(this.context));
    }

    onWebSocketMessageOut(message) {
        return this._iterate((listener) => listener.onWebSocketMessageOut(this.context, message));
    }

    onNewPlayer(player) {
        return this._iterate((listener) => listener.onNewPlayer(this.context, player));
    }

    onDestroyPlayer(player) {
        return this._iterate((listener) => listener.onDestroyPlayer(this.context, player));
    }

    _iterate(func) {
        return new Promise((resolve, reject) => {
            const errors = [];
            const listeners = this.listeners.slice();
            const next = () => {
                if (!listeners.length) {
                    return errors.length ? reject(errors) : resolve();
                }

                const listener = listeners.shift();
                try {
                    func(listener);
                } catch (error) {
                    errors.push(error);
                }

                next();
            };

            next();
        });
    }
}

module.exports = {EventEmitter};