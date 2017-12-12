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

        const pending = await dbClient.getPending();
        const errors = await dbClient.getErrors();

        // todo format the data for display

        res.render('upload', {
            result: req.query.result,
            error: req.query.error,
            pending: pending.length,
            errors: errors.length});
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

    return router;
};

function parseCsv(datafile, dbClient) {

    return new Promise(function(resolve, reject) {

        const parser = parse({delimiter: ',', skip_empty_lines: true});

        parser.on('readable', function() {
            let record;
            while(record = parser.read()) {
                dbClient.stageCaseload(record[0], record[1], record[2]);
            }
        });

        parser.on('error', function(err) {
            return reject(err.message);
        });

        parser.on('finish', function() {

            // todo fill in the missing nomis ids

            // todo merge staging into master, eg
            dbClient.mergeStagingToMaster();

            return resolve(parser.lines);
        });

        parser.write(datafile.data);
        parser.end();
    });
}
