const express = require('express');
const config = require('../config');

module.exports = function({logger, csvParser, dbClient, batchloadService, audit, authenticationMiddleware}) {
    const router = express.Router();
    router.use(authenticationMiddleware());

    const fillingRate = config.nomis.findNomisIdIntervalMillis;
    const sendingRate = config.nomis.sendRelationshipIntervalMillis;
    const columns = config.csv.columns;
    const delimiter = config.csv.delimiter;
    const columnSpec = Object.values(columns).join(delimiter);

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

            const countData = req.flash('counts');
            const counts = countData ? countData[0] : {};

            res.render('upload', {...resultData, ...activityData, counts, fillingRate, sendingRate, columnSpec});
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    async function getActivityStateData() {
        const invalidCount = await dbClient.getInvalidCount();
        const validCount = await dbClient.getValidCount();
        const completeCount = await dbClient.getCompleteCount();
        const uploadedCount = await dbClient.getUploadedCount();
        const duplicateCount = await dbClient.getDuplicateCount();
        const incompleteCount = await dbClient.getIncompleteCount();
        const fillRejectedCount = await dbClient.getFillRejectedCount();

        const usableCount = completeCount.rows[0].count - 2*duplicateCount.rows[0].count;

        const pending = await dbClient.getPendingCount();
        const rejected = await dbClient.getRejectedCount();
        const sent = await dbClient.getSentCount();

        const isFilling = batchloadService.isFilling();
        const isSending = batchloadService.isSending();

        return {
            invalidCount: invalidCount.rows[0].count,
            validCount: validCount.rows[0].count,
            completeCount: completeCount.rows[0].count,
            uploadedCount: uploadedCount.rows[0].count,
            duplicateCount: duplicateCount.rows[0].count,
            incompleteCount: incompleteCount.rows[0].count,
            fillRejectedCount: fillRejectedCount.rows[0].count,

            usableCount,

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
            audit.record('UPLOAD_STARTED', req.user.username);
            await dbClient.clearUpload();
            const {lineCount, recordCount, addedCount} =
                await csvParser.parseCsv(datafile.data, config.csv.columns, config.csv.delimiter);
            audit.record('UPLOAD_DONE', req.user.username, {rows: addedCount});
            req.flash('counts', {lineCount, recordCount, addedCount});
            res.redirect('/');

        } catch (error) {
            logger.error(error);

            const detail = error.detail ? error.detail : '';

            res.redirect('/?error=' + error + ' - ' + detail);
        }
    });

    router.get('/clearMaster', async (req, res, next) => {
        logger.info('GET /clearMaster');
        try {
            audit.record('CLEAR_MASTER', req.user.username);
            await dbClient.clearMaster();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/setPending', async (req, res, next) => {
        logger.info('GET /setPending');
        try {
            audit.record('SET_PENDING', req.user.username);
            await dbClient.setPending();
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
                audit.record('FILL_STARTED', req.user.username);
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
            audit.record('FILL_STOPPED', req.user.username);
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
            audit.record('MERGE', req.user.username);
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
                audit.record('SEND_STARTED', req.user.username);
                await dbClient.resetErrors();
                await batchloadService.send(req.user.username);
            } catch (error) {
                logger.error(error);
                res.redirect('/?error=' + error);
            }
        }
        res.redirect('/');
    });

    router.get('/send404', async (req, res, next) => {
        logger.info('GET /send');
        if (!batchloadService.isFilling() && !batchloadService.isSending()) {
            try {
                audit.record('SEND_STARTED', req.user.username);
                await dbClient.resetErrors();
                await batchloadService.send(req.user.username, true);
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
            audit.record('SEND_STOPPED', req.user.username);
            await batchloadService.stopSending();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewUpload', async (req, res, next) => {
        logger.info('GET /viewUpload');

        try {
            const upload = await dbClient.getUploaded();

            res.render('errorReport', {
                heading: 'Uploaded',
                rows: upload.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewMaster', async (req, res, next) => {
        logger.info('GET /viewMaster');

        try {
            const master = await dbClient.getMaster();

            res.render('errorReport', {
                heading: 'All',
                rows: master.rows,
                moment: require('moment')
            });
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/viewInvalid', async (req, res, next) => {
        logger.info('GET /viewInvalid');

        try {
            const invalid = await dbClient.getInvalid();

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

    router.get('/viewDuplicate', async (req, res, next) => {
        logger.info('GET /viewDuplicate');

        try {
            const duplicates = await dbClient.getDuplicate();

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
            const incomplete = await dbClient.getIncomplete();

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
            audit.record('REMOVE_INVALID', req.user.username);
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
            audit.record('REMOVE_DUPLICATE', req.user.username);
            await dbClient.removeDuplicate();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/remove404master', async (req, res, next) => {
        logger.info('GET /remove404master');
        try {
            audit.record('REMOVE_404', req.user.username);
            await dbClient.remove404master();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/remove404', async (req, res, next) => {
        logger.info('GET /remove404');
        try {
            audit.record('REMOVE_404', req.user.username);
            await dbClient.remove404();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    router.get('/clearUpload', async (req, res, next) => {
        logger.info('GET /clearUpload');
        try {
            audit.record('CLEAR_UPLOAD', req.user.username);
            await dbClient.clearUpload();
            res.redirect('/');
        } catch (error) {
            logger.error(error);
            res.redirect('/?error=' + error);
        }
    });

    return router;
};
