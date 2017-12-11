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

        res.render('upload', {pending: pending.length, errors: errors.length});
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

        parse(datafile.data, function(err, caseloads) {

            // todo better way of parsing csv using the csv library

            caseloads.forEach(function(row, index) {

                console.log([index, row[0], row[1]].join(' - '));

                if(isValid(row)) {
                    dbClient.addCaseload(row[0], row[1]);
                } else {
                    dbClient.addCaseloadError(index, row[0], row[1]);
                }
            });
        });

        res.redirect('/');
    }));

    return router;
};

function isValid(row) {

    // todo proper validation

    const valid = row[0] === 'staffid1';
    console.log(valid);
    return valid;
}
