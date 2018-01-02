const logger = require('../../log');
const config = require('../config');
const {IntervalQueue} = require('../utils/intervalQueue');
const {NomisWrapper} = require('./nomisWrapper');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient, audit, signInService) {

    const systemUserInfo = {
        name: config.systemUser.username,
        pass: config.systemUser.password,
        roles: config.roles.systemUser
    };

    const nomisWrapper = new NomisWrapper(nomisClientBuilder, signInService, systemUserInfo);

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

    async function fill() {
        fillingState = true;
        await startFilling();
    }

    function fillingFinished() {
        fillingState = false;
        audit.record('FILL_DONE', 'SYSTEM');
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
        logger.debug('findNomisId for PNC: ' + pnc);
        try {
            const nomisResult = await nomisWrapper.getNomisIdForPnc(pnc);
            if (nomisResult.length < 1) {
                return {pnc, rejection: 'Empty Response'};
            }
            return {pnc, id: nomisResult[0].offenderId};

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

    async function send() {
        sendingState = true;
        await startSending();
    }

    function sendingFinished() {
        sendingState = false;
        audit.record('SEND_DONE', 'SYSTEM');
    }

    async function startSending() {
        const pending = await dbClient.getPending();
        sendingQueue.start(pending);
    }

    async function sendRelationToApi(record) {
        logger.debug('sendRelationToApi');
        const nomisId = record.OFFENDER_NOMIS.value;
        const staffId = record.STAFF_ID.value;
        const first = record.STAFF_FIRST.value;
        const last = record.STAFF_LAST.value;
        const rowId = record.ID.value;

        const result = await updateNomis(nomisId, staffId, first, last);
        await dbClient.updateWithNomisResult(rowId, result.rejection);
    }

    async function updateNomis(nomisId, staffId, first, last) {
        logger.info('sending record to nomis, with nomisId: ' + nomisId + ' for staffid: ' + staffId);
        try {
            await nomisWrapper.postComRelation(nomisId, staffId, first, last);
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

