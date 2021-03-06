const express = require('express');
const asyncMiddleware = require('../utils/asyncMiddleware');
const config = require('../config');

module.exports = function({logger, dbClient, authenticationMiddleware}) {
    const router = express.Router();
    router.use(authenticationMiddleware());

    router.use(function(req, res, next) {
        if (typeof req.csrfToken === 'function') {
            res.locals.csrfToken = req.csrfToken();
        }
        next();
    });

    router.get('/', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /audit');
        try {
            const audit = await dbClient.getAudit(config.audit.max);

            res.render('audit', {
                report: audit.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    }));

    return router;
};
