const logger = require('../../log.js');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    const systemUserToken = 'todo';
    const nomisClient = nomisClientBuilder(systemUserToken);

    async function fill() {
        logger.info('filling missing nomis IDs');

        try {
            const incomplete = await dbClient.getStagedIncomplete();

            await Promise.all(incomplete.map(async record => {
                const pnc = record.OFFENDER_PNC.value;
                const result = await findNomisId(record.OFFENDER_PNC.value);

                if (result.success) {
                    logger.info('For pnc: ' + pnc + ' found nomisId: ' + result.id);
                    await dbClient.fillNomisId(record.ID.value, result.id);
                } else {
                    logger.warn('Did not find valid nomisID for pnc: ' + pnc);
                    await dbClient.markFillRejected(record.ID.value, result.message);
                }
            }));

        } catch (error) {
            logger.error('Error during fill: ', error.message);
            throw error;
        }
    }

    async function findNomisId(pnc) {
        try {

            const masterResult = await dbClient.findNomisId(pnc);

            if (masterResult.length > 0 && masterResult[0].OFFENDER_NOMIS.value) {
                logger.info('Found nomisID already in master: ' + masterResult[0].OFFENDER_NOMIS.value);
                return {success: true, id: masterResult[0].OFFENDER_NOMIS.value};
            }

            const nomisResult = await nomisClient.getNomisIdForPnc(pnc);
            return {success: true, id: nomisResult[0].offenderId};

        } catch(error) {
            logger.warn('Error looking up nomis ID: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : 'Unknown';
            const message = status + ': ' + JSON.stringify(errorMessage);
            return {success: false, message};
        }
    }

    async function send() {
        logger.info('sending to nomis');

        try {
            const pending = await dbClient.getPending();

            await Promise.all(pending.map(async record => {

                const nomisId = record.OFFENDER_NOMIS.value;
                const staffId = record.STAFF_ID.value;

                const result = await updateNomis(nomisId, staffId);

                if(result.success) {
                    await dbClient.markProcessed(record.ID.value);
                } else {
                    await dbClient.markRejected(record.ID.value, result.message);
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
        } catch(error) {
            logger.warn('Error updating nomis: ' + error);
            const status = error.status ? error.status : '0';
            const errorMessage = error.response && error.response.body ? error.response.body : 'Unknown';
            const message = status + ': ' + JSON.stringify(errorMessage);
            return {success: false, message};
        }
    }

    return {fill, send};
};
