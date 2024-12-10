const { config } = require('dotenv');

config();

module.exports = {
    metrics: {
        prometheus: {
            isEnabled: process.env.METRICS_PROMETHEUS_ENABLED === 'true',
            endpoint: process.env.METRICS_PROMETHEUS_ENDPOINT
        }
    }
};

