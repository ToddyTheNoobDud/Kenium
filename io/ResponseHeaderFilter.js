const { Router } = require('express');

const responseHeaderMiddleware = (req, res, next) => {
    res.setHeader('Lavalink-Api-Version', '4');
    next();
};

const router = Router();
router.use(responseHeaderMiddleware);

module.exports = router;
