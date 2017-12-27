const express = require('express');
const asyncMiddleware = require('../utils/asyncMiddleware');

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
        const audit = await dbClient.getAudit();
        const report = audit ? audit.map(r => [r.TIMESTAMP.value, r.USER.value, r.ACTION.value, r.DETAILS.value]) : [];
        res.render('audit', {
            report,
            moment: require('moment')
        });
    }));

    return router;
};
