const logger = require('../../log.js');

const RateLimiter = require('limiter').RateLimiter;

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    const systemUserToken = 'todo';
    const nomisClient = nomisClientBuilder(systemUserToken);

    let isFilling = false;

    function getFilling() {
        return isFilling;
    }

    async function fill() {

        fillingState = true;

        startFilling();

        fillingState = false;
    }

    async function startFilling() {

        console.log('start filling');

        const result = await dbClient.copyNomisIdsFromMaster();

        const pncs = await dbClient.getPncs();
        console.log(pncs);

        const pncToNomis = await getNomisIds(pncs);
        console.log(pncToNomis);

        const result2 = await fillNomisIdsFromNomis(pncToNomis);

        console.log('stop filling');
    }

    async function getNomisIds(pncs) {
        console.log('getNomisIds');

        const nomisLimiter = new RateLimiter(1, 10000);

        return Promise.all(pncs.map(async p => {
            const pnc = p.OFFENDER_PNC.value;
            return await findNomisIdLimited(nomisLimiter, pnc);
        }));
    }

    async function findNomisIdLimited(limiter, pnc) {

        console.log('findNomisIdLimited');

        return new Promise((resolve, reject) => {
            limiter.removeTokens(1, async function(err, remainingRequests) {
                console.log('limiter callback');

                if (err) {
                    return reject(err);
                }
                const result = await findNomisId(pnc);
                return resolve(result);
            });
        });
    }


    async function findNomisId(pnc) {

        console.log('Looking for nomis id from api for: ' + pnc);

        try {
            const nomisResult = await nomisClient.getNomisIdForPnc(pnc);
            return {pnc, id: nomisResult[0].offenderId};

        } catch (error) {
            logger.warn('Error looking up nomis ID: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : 'Unknown';
            const rejection = status + ': ' + JSON.stringify(errorMessage);

            return {pnc, rejection};
        }
    }

    async function fillNomisIdsFromNomis(pncToNomis) {
        console.log('fillNomisIds');

        const {connection, bulkload} = await dbClient.getApiResultsBulkload();

        pncToNomis.forEach(result => {
            const nomisId = result.id || null;
            const rejection = result.rejection || null;

            console.log('addrow: ' + result.pnc + ' ' + nomisId + ' ' + rejection);
            bulkload.addRow(result.pnc, nomisId, rejection);
        });

        await dbClient.deleteApiResults();
        const insertedCount = connection.execBulkLoad(bulkload);
        console.log(insertedCount);

        await dbClient.mergeApiResults();
    }

    async function send() {
        logger.info('sending to nomis');

        try {
            const pending = await dbClient.getPending();

            await Promise.all(pending.map(async record => {

                const nomisId = record.OFFENDER_NOMIS.value;
                const staffId = record.STAFF_ID.value;

                const result = await updateNomis(nomisId, staffId);

                if (result.success) {
                    await dbClient.markProcessed(record.ID.value);
                } else {
                    await dbClient.markFillRejected(record.ID.value, result.message);
                }
            }));

        } catch (error) {
            logger.error('Error during send: ', error.message);
            throw error;
        }
    }

    async function updateNomis(nomisId, staffId) {
        console.log('sending record to nomis, with nomisId: ' + nomisId + ' for staffid: ' + staffId);
        try {
            await nomisClient.postComRelation(nomisId, staffId);
            return {success: true};
        } catch (error) {
            logger.warn('Error updating nomis: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : 'Unknown';
            const message = status + ': ' + JSON.stringify(errorMessage);
            return {success: false, message};
        }
    }

    return {fill, send};
};
