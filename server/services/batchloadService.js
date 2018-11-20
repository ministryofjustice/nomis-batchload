const logger = require('../../log');
const config = require('../config');
const {IntervalQueue} = require('../utils/intervalQueue');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient, audit) {

    const fillingQueue = new IntervalQueue(fillNomisIdFromApi, config.nomis.findNomisIdIntervalMillis, fillingFinished);
    const sendingQueue = new IntervalQueue(sendRelationToApi, config.nomis.sendRelationshipIntervalMillis, sendingFinished);

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
        // await dbClient.copyNomisIdsFromMaster();
        const pncs = await dbClient.getStagedPncs();
        fillingQueue.start(username, pncs.rows);
    }

    async function fillNomisIdFromApi(username, pnc) {
        const nomisId = await findNomisId(username, pnc.offender_pnc, pnc.id);
        await fillNomisId(nomisId);
    }

    async function findNomisId(username, pnc, rowId, retry = false) {
        logger.debug('findNomisId for PNC: ' + pnc);
        try {
            const nomisClient = nomisClientBuilder(username);

            const nomisResult = await nomisClient.getNomisIdForPnc(retry ? pnc : unpad(pnc));

            if (nomisResult.length < 1) {
                return {pnc, rejection: 'Empty Response'};
            }
            return {rowId, nomisId: nomisResult[0].offenderNo};

        } catch (error) {
            logger.warn('Error looking up nomis ID: ' + error);

            if (!retry && error.status === 404) {
                return findNomisId(username, pnc, rowId, true);
            }

            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : error.message;
            const rejection = status + ': ' + JSON.stringify(errorMessage);

            return {rowId, rejection};
        }
    }

    function unpad(pnc) {
        const pncParts = pnc.split('/');

        if (pncParts.length === 2) {
            return pncParts[0].substr(2) + '/' + pncParts[1].replace(/^(0{1,2})/g, '');
        }

        return pnc;
    }

    async function fillNomisId(result) {
        const nomisId = result.nomisId || null;
        const rejection = result.rejection || null;

        await dbClient.fillNomisId(result.rowId, nomisId, rejection);
    }

    async function send(username, with404 = false) {
        sendingState = true;
        await startSending(username, with404);
    }

    function sendingFinished() {
        sendingState = false;
        audit.record('SEND_DONE', 'SYSTEM');
    }

    async function startSending(username, with404) {
        const pending = with404 ? await dbClient.get404() : await dbClient.getPending();
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

