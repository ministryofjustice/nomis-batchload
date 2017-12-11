const express = require('express');
const asyncMiddleware = require('../utils/asyncMiddleware');


module.exports = function({logger, batchloadService, authenticationMiddleware}) {
    const router = express.Router();
    router.use(authenticationMiddleware());

    router.use(function(req, res, next) {
        if (typeof req.csrfToken === 'function') {
            res.locals.csrfToken = req.csrfToken();
        }
        next();
    });

    router.get('/', asyncMiddleware(async (req, res, next) => {
        logger.debug('GET /send');

        await batchloadService.send();

        res.redirect('/');
    }));

    return router;
};

