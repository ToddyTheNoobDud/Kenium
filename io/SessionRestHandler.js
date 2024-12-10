const express = require('express');
const router = express.Router();

const socketServer = require('./SocketServer'); // Adjust the path as necessary

router.patch('/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const { resuming, timeout } = req.body;

    const context = socketServer.socketContext(sessionId);

    if (resuming !== undefined) {
        context.resumable = resuming;
    }

    if (timeout !== undefined) {
        context.resumeTimeout = timeout.inWholeSeconds;
    }

    res.json({
        resumable: context.resumable,
        timeout: context.resumeTimeout,
    });
});

module.exports = router;

