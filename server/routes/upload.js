const express = require('express');

const config = require('../config');

module.exports = function({logger, csvParser, dbClient, batchloadService, authenticationMiddleware}) {
    const router = express.Router();
    router.use(authenticationMiddleware());

    router.use(function(req, res, next) {
        if (typeof req.csrfToken === 'function') {
            res.locals.csrfToken = req.csrfToken();
        }
        next();
    });

    router.get('/', async (req, res, next) => {
        logger.info('GET /upload');

        try {
            const resultData = {result: req.query.result, error: req.query.error};
            const activityData = await getActivityStateData();

            res.render('upload', {...resultData, ...activityData});
        } catch(error) {
            res.redirect('/?error=' + error);
        }
    });

    async function getActivityStateData() {
        const stagedIncomplete = await dbClient.getStagedIncompleteCount();
        const staged = await dbClient.getStagedCount();
        const pending = await dbClient.getPendingCount();
        const rejected = await dbClient.getRejectedCount();

        const isFilling = batchloadService.isFilling();
        const isSending = batchloadService.isSending();

        return {
            stagedIncomplete: stagedIncomplete[0].COUNT.value,
            staged: staged[0].COUNT.value,
            pending: pending[0].COUNT.value,
            rejected: rejected[0].COUNT.value,
            isFilling,
            isSending
        };
    }

    router.post('/', async (req, res, next) => {
        logger.info('POST /upload');

        if (!req.files || !req.files.datafile) {
            return res.status(400).send('No files were uploaded.');
        }

        const datafile = req.files.datafile;

        if (datafile.mimetype !== 'text/csv') {
            return res.status(400).send('CSV only.');
        }

        try {

            await dbClient.clearStaged();
            const insertedCount = await csvParser.parseCsv(datafile.data, config.csv.columns, config.csv.delimiter);
            res.redirect('/?result=' + insertedCount);

        } catch (error) {
            res.redirect('/?error=' + error);
        }

    });

    router.get('/clearStaged', async (req, res, next) => {
        logger.info('GET /clearStaged');
        try {
            await dbClient.clearStaged();

            res.redirect('/');
        } catch(error) {
            res.redirect('/?error=' + error);
        }
    });

    router.get('/fill', async (req, res, next) => {
        logger.info('GET /fill');
        try {
            await batchloadService.fill();
            res.redirect('/');
        } catch (error) {
            res.redirect('/?error=' + error);
        }
    });

    router.get('/activityStatus', async (req, res, next) => {
        logger.info('GET /activityStatus');
        try {
            const activityData = await getActivityStateData();
            res.status(200).json(activityData);
        } catch(error) {
            res.status(500).json({error});
        }
    });

    router.get('/stopFill', (req, res, next) => {
        logger.info('GET /stopFill');
        batchloadService.stopFilling();
        res.redirect('/');
    });

    router.get('/stopSend', (req, res, next) => {
        logger.info('GET /stopSend');
        batchloadService.stopSending();
        res.redirect('/');
    });

    router.get('/merge', async (req, res, next) => {
        logger.info('GET /merge');

        console.log('MERGE STAGING TO MASTER');
        try {
            await dbClient.mergeStageToMaster();
        } catch (err) {
            console.error(err);
        }

        res.redirect('/');
    });

    router.get('/send', async (req, res, next) => {
        logger.info('GET /send');

        await batchloadService.send();

        res.redirect('/');
    });

    router.get('/viewIncomplete', async (req, res, next) => {
        logger.info('GET /viewIncomplete');

        try {
            const incomplete = await dbClient.getStagedIncomplete();

            const report = incomplete.map(r => [r.ID.value, r.TIMESTAMP.value, r.OFFENDER_NOMIS.value,
                r.OFFENDER_PNC.value, r.STAFF_ID.value, r.REJECTION.value]
            );

            res.render('errorReport', {heading: 'Incomplete', report});
        } catch(error) {
            res.redirect('/?error=' + error);
        }

    });

    router.get('/viewErrors', async (req, res, next) => {
        logger.info('GET /viewErrors');

        try {
            const rejected = await dbClient.getRejected();

            const report = rejected? rejected.map(r => [r.ID.value, r.TIMESTAMP.value, r.OFFENDER_NOMIS.value,
                r.OFFENDER_PNC.value, r.STAFF_ID.value, r.REJECTION.value]
            ) : [];

            res.render('errorReport', {heading: 'Nomis Rejections', report});
        } catch(error) {
            res.redirect('/?error=' + error);
        }
    });

    return router;
};
