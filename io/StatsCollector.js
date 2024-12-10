const oshi = require('os-utils');
const os = require('os');
const process = require('process');

class StatsCollector {
    constructor(socketServer) {
        this.socketServer = socketServer;
        this.prevTicks = null;
        this.uptime = 0.0;
        this.cpuTime = 0.0;
    }

    // Record for next invocation
    get processRecentCpuUsage() {
        const p = process.cpuUsage();
        if (this.cpuTime != 0.0) {
            const uptimeDiff = p.user + p.system - this.cpuTime;
            const cpuDiff = (p.user + p.system) - this.cpuTime;
            return cpuDiff / uptimeDiff;
        } else {
            return (p.user + p.system) / p.system;
        }
    }

    createTask(context) {
        return () => {
            try {
                const stats = this.retrieveStats(context);
                context.sendMessage(Message.Serializer, Message.StatsEvent(stats));
            } catch (e) {
                console.error("Exception while sending stats", e);
            }
        };
    }

    retrieveStats(context) {
        const playersTotal = [0];
        const playersPlaying = [0];
        this.socketServer.contexts.forEach((socketContext) => {
            playersTotal[0] += socketContext.players.size;
            playersPlaying[0] += socketContext.playingPlayers.size;
        });

        const uptime = Date.now() - process.uptime() * 1000;

        // In bytes
        const mem = {
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            allocated: os.totalmem(),
            reservable: os.totalmem()
        };

        // prevTicks will be null so set it to a value.
        if (this.prevTicks == null) {
            this.prevTicks = oshi.cpuUsage();
        }

        const cpu = {
            cores: os.cpus().length,
            systemLoad: oshi.cpuUsage(this.prevTicks),
            lavalinkLoad: this.processRecentCpuUsage
        };

        // Set new prevTicks to current value for more accurate baseline, and checks in the next schedule.
        this.prevTicks = oshi.cpuUsage();

        var frameStats;
        if (context) {
            var playerCount = 0;
            var totalSent = 0;
            var totalNulled = 0;
            for (const player of context.playingPlayers) {
                const counter = player.audioLossCounter;
                if (!counter.isDataUsable) continue;
                playerCount++;
                totalSent += counter.lastMinuteSuccess;
                totalNulled += counter.lastMinuteLoss;
            }

            // We can't divide by 0
            if (playerCount != 0) {
                const totalDeficit = playerCount *
                        AudioLossCounter.EXPECTED_PACKET_COUNT_PER_MIN -
                        (totalSent + totalNulled);

                frameStats = {
                    sent: totalSent / playerCount,
                    nulled: totalNulled / playerCount,
                    deficit: totalDeficit / playerCount
                };
            }
        }

        return {
            frameStats,
            playersTotal: playersTotal[0],
            playersPlaying: playersPlaying[0],
            uptime,
            mem,
            cpu
        };
    }
}

module.exports = {StatsCollector};

