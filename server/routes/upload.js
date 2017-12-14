const express = require('express');
const asyncMiddleware = require('../utils/asyncMiddleware');

module.exports = function({logger, csvParser, dbClient, batchloadService, authenticationMiddleware}) {
    const router = express.Router();
    router.use(authenticationMiddleware());

    router.use(function(req, res, next) {
        if (typeof req.csrfToken === 'function') {
            res.locals.csrfToken = req.csrfToken();
        }
        next();
    });

    router.get('/', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /upload');

        const stagedIncomplete = await dbClient.getStagedIncompleteCount();
        const staged = await dbClient.getStagedCount();
        const pending = await dbClient.getPendingCount();
        const rejected = await dbClient.getRejectedCount();

        res.render('upload', {
            result: req.query.result,
            error: req.query.error,
            stagedIncomplete: stagedIncomplete[0].COUNT.value,
            staged: staged[0].COUNT.value,
            pending: pending[0].COUNT.value,
            rejected: rejected[0].COUNT.value
        });
    }));

    router.post('/', asyncMiddleware(async (req, res, next) => {
        logger.info('POST /upload');

        if (!req.files || !req.files.datafile) {
            return res.status(400).send('No files were uploaded.');
        }

        const datafile = req.files.datafile;

        if (datafile.mimetype !== 'text/csv') {
            return res.status(400).send('CSV only.');
        }

        try {
            const result = await csvParser.parseCsv(datafile.data);
            res.redirect('/?result=' + result);

        } catch (error) {
            res.redirect('/?error=' + error);
        }

    }));

    router.get('/fill', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /fill');

        await batchloadService.fill();

        res.redirect('/');
    }));

    router.get('/merge', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /merge');

        console.log('MERGE STAGING TO MASTER');
        try {
            await dbClient.merge();
        } catch (err) {
            console.error(err);
        }

        res.redirect('/');
    }));

    router.get('/send', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /send');

        await batchloadService.send();

        res.redirect('/');
    }));

    router.get('/viewErrors', asyncMiddleware(async (req, res, next) => {
        logger.info('GET /viewErrors');

        const rejected = await dbClient.getRejected();

        const report = rejected.map(r => [r.ID.value, r.TIMESTAMP.value, r.OFFENDER_NOMIS.value,
            r.OFFENDER_PNC.value, r.STAFF_ID.value, r.REJECTION.value]
        );
        console.log(report);

        res.render('errorReport', {report});
    }));

    return router;
};
