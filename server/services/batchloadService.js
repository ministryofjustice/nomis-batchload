const logger = require('../../log');
const config = require('../config');
const {IntervalQueue} = require('../utils/intervalQueue');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient, audit) {

    const fillingQueue = new IntervalQueue(fillNomisIdFromApi, config.nomis.getRateLimit, fillingFinished);
    const sendingQueue = new IntervalQueue(sendRelationToApi, config.nomis.postRateLimit, sendingFinished);

    let fillingState = false;
    let sendingState = false;

    function isFilling() {
        return fillingState;
    }

    function stopFilling() {
        fillingQueue.stop();
        fillingState = false;
    }

    function isSending() {
        return sendingState;
    }

    function stopSending() {
        sendingQueue.stop();
        sendingState = false;
    }

    async function fill(username) {
        fillingState = true;
        await startFilling(username);
    }

    function fillingFinished() {
        fillingState = false;
        audit.record('FILL_DONE', 'SYSTEM');
    }

    async function startFilling(username) {
        await dbClient.copyNomisIdsFromMaster();
        const pncs = await dbClient.getStagedPncs();
        fillingQueue.start(username, pncs.rows);
    }

    async function fillNomisIdFromApi(username, pnc) {
        const pncValue = pnc.offender_pnc;
        const nomisId = await findNomisId(username, pncValue);
        await fillNomisId(nomisId);
    }

    async function findNomisId(username, pnc) {
        logger.debug('findNomisId for PNC: ' + pnc);
        try {
            const nomisClient = nomisClientBuilder(username);
            const nomisResult = await nomisClient.getNomisIdForPnc(pnc);

            if (nomisResult.length < 1) {
                return {pnc, rejection: 'Empty Response'};
            }
            return {pnc, id: nomisResult[0].offenderNo};

        } catch (error) {
            logger.warn('Error looking up nomis ID: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : error.message;
            const rejection = status + ': ' + JSON.stringify(errorMessage);

            return {pnc, rejection};
        }
    }

    async function fillNomisId(result) {
        const nomisId = result.id || null;
        const rejection = result.rejection || null;

        await dbClient.fillNomisId(result.pnc, nomisId, rejection);
    }

    async function send(username) {
        sendingState = true;
        await startSending(username);
    }

    function sendingFinished() {
        sendingState = false;
        audit.record('SEND_DONE', 'SYSTEM');
    }

    async function startSending(username) {
        const pending = await dbClient.getPending();
        sendingQueue.start(username, pending.rows);
    }

    async function sendRelationToApi(username, record) {
        logger.debug('sendRelationToApi');
        const nomisId = record.offender_nomis;
        const staffId = record.staff_id;
        const first = record.staff_first;
        const last = record.staff_last;
        const rowId = record.id;

        const result = await updateNomis(username, nomisId, staffId, first, last);
        await dbClient.updateWithNomisResult(rowId, result.rejection);
    }

    async function updateNomis(username, nomisId, staffId, first, last) {
        logger.info('sending record to nomis, with nomisId: ' + nomisId + ' for staffid: ' + staffId);
        try {
            const nomisClient = nomisClientBuilder(username);
            await nomisClient.postComRelation(nomisId, staffId, first, last);
            return {rejection: null};
        } catch (error) {
            logger.warn('Error updating nomis: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : error.message;
            const rejection = status + ': ' + JSON.stringify(errorMessage);
            return {rejection};
        }
    }

    return {fill, send, isFilling, isSending, stopFilling, stopSending, fillingFinished, sendingFinished};
};

