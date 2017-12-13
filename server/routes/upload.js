const express = require('express');
const asyncMiddleware = require('../utils/asyncMiddleware');

const parse = require('csv-parse');

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
        logger.debug('GET /upload');

        const stagedIncomplete = await dbClient.getStagedIncompleteCount();
        const staged = await dbClient.getStagedCount();
        const pending = await dbClient.getPendingCount();
        const errors = await dbClient.getErrorsCount();

        res.render('upload', {
            result: req.query.result,
            error: req.query.error,
            stagedIncomplete: stagedIncomplete[0].COUNT.value,
            staged: staged[0].COUNT.value,
            pending: pending[0].COUNT.value,
            errors: errors[0].COUNT.value
            });
    }));

    router.post('/', asyncMiddleware(async (req, res, next) => {
        logger.debug('POST /upload');

        if (!req.files || !req.files.datafile) {
            return res.status(400).send('No files were uploaded.');
        }

        const datafile = req.files.datafile;

        if (datafile.mimetype !== 'text/csv') {
            return res.status(400).send('CSV only.');
        }

        try {
            const result = await parseCsv(datafile, dbClient);
            res.redirect('/?result=' + result);

        } catch(error) {
            res.redirect('/?error=' + error);
        }

    }));

    router.get('/fill', asyncMiddleware(async (req, res, next) => {
        logger.debug('GET /fill');

        console.log('FILL MISSING NOMIS IDS');

        res.redirect('/');
    }));

    router.get('/merge', asyncMiddleware(async (req, res, next) => {
        logger.debug('GET /merge');

        console.log('MERGE STAGING TO MASTER');

        res.redirect('/');
    }));

    router.get('/send', asyncMiddleware(async (req, res, next) => {
        logger.debug('GET /send');

        console.log('SEND ALL PENDING RECORDS TO NOMIS');

        res.redirect('/');
    }));

    router.get('/downloadErrors', asyncMiddleware(async (req, res, next) => {
        logger.debug('GET /downloadErrors');

        console.log('MAKE A CSV OF ERROR RECORDS IN MASTER FOR DOWNLOAD');

        res.redirect('/');
    }));

    return router;
};

function parseCsv(datafile, dbClient) {

    return new Promise(function(resolve, reject) {

        const parser = parse({delimiter: ',', skip_empty_lines: true});

        parser.on('readable', function() {
            let record;
            while(record = parser.read()) {
                const offenderNomis = record[0].length > 1 ? record[0] : '';
                const offenderPnc = record[1].length > 1 ? record[1] : '';
                const staffId = record[2].length > 1 ? record[2] : '';

                dbClient.stageCaseload(offenderNomis, offenderPnc, staffId);
            }
        });

        parser.on('error', function(err) {
            return reject(err.message);
        });

        parser.on('finish', function() {
            return resolve(parser.lines);
        });

        parser.write(datafile.data);
        parser.end();
    });
}
