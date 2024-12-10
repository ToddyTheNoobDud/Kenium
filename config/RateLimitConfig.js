module.exports = class RateLimitConfig {
    constructor() {
        this.ipBlocks = [];
        this.excludedIps = [];
        this.strategy = "RotateOnBan";
        this.retryLimit = -1;
        this.searchTriggersFail = true;
    }
}
