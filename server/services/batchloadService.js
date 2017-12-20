const logger = require('../../log');
const config = require('../config');
const RateLimiter = require('limiter').RateLimiter;
const intervalQueue = require('../utils/intervalQueue');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    const systemUserToken = 'todo';
    const nomisClient = nomisClientBuilder(systemUserToken);

    let fillingState = false;
    let sendingState = false;

    function isFilling() {
        return fillingState;
    }

    async function stopFilling() {
        console.log('stop filling');
        intervalQueue.stop();
        fillingState = false;
    }

    function isSending() {
        return sendingState;
    }

    async function stopSending() {
        console.log('stop sending');
        sendingState = false;
    }

    async function fill() {
        fillingState = true;
        startFilling();
    }

    function fillingFinished() {
        console.log('filling finished called');
        fillingState = false;
    }

    async function startFilling() {
        await dbClient.copyNomisIdsFromMaster();

        const pncs = await dbClient.getPncs();

        intervalQueue.start(pncs, fillNomisIdFromApi, config.nomis.getRateLimit, fillingFinished);
    }

    async function fillNomisIdFromApi(pnc) {
        const pncValue = pnc.OFFENDER_PNC.value
        console.log('QUEUED METHOD FIRED ', pncValue);
        const nomisId = await findNomisId(pncValue);
        await fillNomisId(nomisId);
    }

    async function findNomisId(pnc) {
        console.log('findNomisId for PNC: ' + pnc);

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

    async function fillNomisId(result) {
        console.log('fillNomisId');
        const nomisId = result.id || null;
        const rejection = result.rejection || null;

        await dbClient.fillNomisId(result.pnc, nomisId, rejection);
    }

    async function send() {
        sendingState = true;
        startSending();
    }

    async function startSending() {

        try {
            const pending = await dbClient.getPending();
            const limiter = new RateLimiter(1, config.nomis.postRateLimit);

            await Promise.all(pending.map(async record => {
                const nomisId = record.OFFENDER_NOMIS.value;
                const staffId = record.STAFF_ID.value;
                return await updateNomisLimited(limiter, record.ID.value, nomisId, staffId);
            })).catch(err => {
                logger.error('Error during startSending promise all: ', err.message);
                throw err;
            });

            sendingState = false;

        } catch (error) {
            logger.error('Error during send: ', error.message);
            throw error;
        }
    }

    async function updateNomisLimited(limiter, rowId, nomisId, staffId) {
        logger.info('updateNomisLimited');
        return new Promise((resolve, reject) => {
            limiter.removeTokens(1, async function(err, remainingRequests) {
                if (err) {
                    return reject(err);
                }

                if (!sendingState) {
                    console.log('STOP sending');
                    return reject('SENDING INTERRUPTED');
                }

                const result = await updateNomis(nomisId, staffId);
                await dbClient.updateWithNomisResult(rowId, result.rejection);
                return resolve();
            });
        });
    }

    async function updateNomis(nomisId, staffId) {
        console.log('sending record to nomis, with nomisId: ' + nomisId + ' for staffid: ' + staffId);
        try {
            await nomisClient.postComRelation(nomisId, staffId);
            return {rejection: null};
        } catch (error) {
            logger.warn('Error updating nomis: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : 'Unknown';
            const rejection = status + ': ' + JSON.stringify(errorMessage);
            return {rejection};
        }
    }

    return {fill, send, isFilling, isSending, stopFilling, stopSending};
};
