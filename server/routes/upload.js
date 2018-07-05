const express = require('express');
const config = require('../config');

module.exports = function({logger, csvParser, dbClient, batchloadService, audit, authenticationMiddleware}) {
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
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    async function getActivityStateData() {
        const uploadInvalid = await dbClient.getUploadInvalidCount();
        const uploadValid = await dbClient.getUploadValidCount();
        const uploadDuplicate = await dbClient.getUploadDuplicateCount();
        const stagedIncomplete = await dbClient.getStagedIncompleteCount();
        const staged = await dbClient.getStagedCount();
        const pending = await dbClient.getPendingCount();
        const rejected = await dbClient.getRejectedCount();
        const sent = await dbClient.getSentCount();

        const isFilling = batchloadService.isFilling();
        const isSending = batchloadService.isSending();

        return {
            uploadInvalid: uploadInvalid.rows[0].count,
            uploadValid: uploadValid.rows[0].count,
            uploadDuplicate: uploadDuplicate.rows[0].count,
            stagedIncomplete: stagedIncomplete.rows[0].count,
            staged: staged.rows[0].count,
            pending: pending.rows[0].count,
            rejected: rejected.rows[0].count,
            sent: sent.rows[0].count,
            isFilling,
            isSending
        };
    }

    router.get('/activityStatus', async (req, res, next) => {
        logger.info('GET /activityStatus');
        try {
            const activityData = await getActivityStateData();
            res.status(200).json(activityData);
        } catch (error) {
            logger.error(error);
            res.status(500).json({error});
        }
    });

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
            audit.record('UPLOAD_STARTED', req.user.email);
            await dbClient.clearUpload();
            const insertedCount = await csvParser.parseCsv(datafile.data, config.csv.columns, config.csv.delimiter);
            audit.record('UPLOAD_DONE', req.user.email, {rows: insertedCount});
            res.redirect('/');

        } catch (error) {
            logger.error(error);

            const detail = error.detail ? error.detail : '';

            res.redirect('/?error=' + error + ' - ' + detail);
        }
    });

    router.get('/stage', async (req, res, next) => {
        logger.info('GET /stage');
        try {
            audit.record('STAGE', req.user.email);
            await dbClient.clearStaged();
            await dbClient.mergeUploadToStage();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/clearStaged', async (req, res, next) => {
        logger.info('GET /clearStaged');
        try {
            audit.record('CLEAR_STAGED', req.user.email);
            await dbClient.clearStaged();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/fill', async (req, res, next) => {
        logger.info('GET /fill');
        if (!batchloadService.isFilling() && !batchloadService.isSending()) {
            logger.info('Starting fill');
            try {
                audit.record('FILL_STARTED', req.user.email);
                await batchloadService.fill(req.user.username);
            } catch (error) {
                logger.error(error);
                res.redirect('/?error=' + error);
            }
        }
        res.redirect('/');
    });

    router.get('/stopFill', async (req, res, next) => {
        logger.info('GET /stopFill');
        try {
            audit.record('FILL_STOPPED', req.user.email);
            batchloadService.stopFilling();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/merge', async (req, res, next) => {
        logger.info('GET /merge');
        try {
            audit.record('MERGE', req.user.email);
            await dbClient.mergeStageToMaster();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/send', async (req, res, next) => {
        logger.info('GET /send');
        if (!batchloadService.isFilling() && !batchloadService.isSending()) {
            try {
                audit.record('SEND_STARTED', req.user.email);
                await batchloadService.send(req.user.username);
            } catch (error) {
                logger.error(error);
                res.redirect('/?error=' + error);
            }
        }
        res.redirect('/');
    });

    router.get('/stopSend', async (req, res, next) => {
        logger.info('GET /stopSend');
        try {
            audit.record('SEND_STOPPED', req.user.email);
            await batchloadService.stopSending();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewInvalid', async (req, res, next) => {
        logger.info('GET /viewInvalid');

        try {
            const invalid = await dbClient.getUploadInvalid();

            res.render('badUploadReport', {
                heading: 'Invalid',
                rows: invalid.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewDuplicates', async (req, res, next) => {
        logger.info('GET /viewDuplicates');

        try {
            const duplicates = await dbClient.getUploadDuplicates();

            res.render('badUploadReport', {
                heading: 'Duplicates',
                rows: duplicates.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewIncomplete', async (req, res, next) => {
        logger.info('GET /viewIncomplete');

        try {
            const incomplete = await dbClient.getStagedIncomplete();

            res.render('errorReport', {
                heading: 'Incomplete',
                rows: incomplete.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewErrors', async (req, res, next) => {
        logger.info('GET /viewErrors');

        try {
            const rejected = await dbClient.getRejected();

            res.render('errorReport', {
                heading: 'Nomis Rejections',
                rows: rejected.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.warn('warn');
            logger.error('error');
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/removeInvalid', async (req, res, next) => {
        logger.info('GET /removeInvalid');
        try {
            audit.record('REMOVE_INVALID', req.user.email);
            await dbClient.removeInvalid();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/removeDuplicate', async (req, res, next) => {
        logger.info('GET /removeDuplicate');
        try {
            audit.record('REMOVE_DUPLICATE', req.user.email);
            await dbClient.removeDuplicate();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/clearUpload', async (req, res, next) => {
        logger.info('GET /clearUpload');
        try {
            audit.record('CLEAR_UPLOAD', req.user.email);
            await dbClient.clearUpload();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    return router;
};
