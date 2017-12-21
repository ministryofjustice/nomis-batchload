const logger = require('../../log');
const config = require('../config');
const {IntervalQueue} = require('../utils/intervalQueue');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    const systemUserToken = 'todo';
    const nomisClient = nomisClientBuilder(systemUserToken);

    const fillingQueue = new IntervalQueue(fillNomisIdFromApi, config.nomis.getRateLimit, fillingFinished);
    const sendingQueue = new IntervalQueue(sendRelationToApi, config.nomis.postRateLimit, sendingFinished);

    let fillingState = false;
    let sendingState = false;

    function isFilling() {
        return fillingState;
    }

    async function stopFilling() {
        fillingQueue.stop();
        fillingState = false;
    }

    function isSending() {
        return sendingState;
    }

    async function stopSending() {
        sendingQueue.stop();
        sendingState = false;
    }

    async function fill() {
        fillingState = true;
        startFilling();
    }

    function fillingFinished() {
        fillingState = false;
    }

    async function startFilling() {
        await dbClient.copyNomisIdsFromMaster();
        const pncs = await dbClient.getStagedPncs();
        fillingQueue.start(pncs);
    }

    async function fillNomisIdFromApi(pnc) {
        const pncValue = pnc.OFFENDER_PNC.value;
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

    function sendingFinished() {
        sendingState = false;
    }

    async function startSending() {
        console.log('start sending');
        const pending = await dbClient.getPending();
        sendingQueue.start(pending);
    }

    async function sendRelationToApi(record) {
        console.log('sendRelationToApi');
        const nomisId = record.OFFENDER_NOMIS.value;
        const staffId = record.STAFF_ID.value;
        const rowId = record.ID.value;

        const result = await updateNomis(nomisId, staffId);
        await dbClient.updateWithNomisResult(rowId, result.rejection);
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
