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
        res.render('upload');
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

        const dataBuffer = datafile.data;
        console.log(dataBuffer.length);
        console.log(dataBuffer.toString('utf8'));

        parse(dataBuffer, function(err, output) {
            console.log(output);
            console.log(output.length);

            // to do validate file
            // to do store file? extract data? what?
        });

        await dbClient.addBatch(datafile.name, req.user.email, 'UNSTARTED');

        res.redirect('/jobs');
    }));

    return router;
};
