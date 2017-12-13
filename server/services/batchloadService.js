const logger = require('../../log.js');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    const systemUserToken = 'todo';
    const nomisClient = nomisClientBuilder(systemUserToken);

    async function fill() {
        logger.info('filling missing nomis IDs');

        try {
            const incomplete = await dbClient.getStagedIncomplete();

            incomplete.forEach(async record => {
                const pnc = record.OFFENDER_PNC.value;
                const nomisId = await findNomisId(record.OFFENDER_PNC.value);

                logger.info('For pnc: ' + pnc + ' found nomisId: ' + nomisId);

                if(nomisId && nomisId !== 'ERROR') {
                    await dbClient.fillNomisId(record.ID.value, nomisId);
                } else {
                    logger.warn('Did not find valid nomisID for pnc: ' + pnc);
                }
            });

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
                return masterResult[0].OFFENDER_NOMIS.value;
            }

            const nomisResult = await nomisClient.getNomisIdForPnc(pnc);
            return nomisResult[0].offenderId;

        } catch (err) {
            logger.warn('ERROR LOOKING UP NOMIS ID ' + err);
            return 'ERROR';
        }
    }

    async function send() {
        logger.info('sending to nomis');

        try {
            const pending = await dbClient.getPending();

            pending.forEach(async record => {

                const nomisId = record.OFFENDER_NOMIS.value;
                const staffId = record.STAFF_ID.value;

                const result = await updateNomis(nomisId, staffId);
                console.log('Nomis response ' + result);

                if(result === 'ERROR'){
                    await dbClient.markRejected(record.ID.value);
                } else {
                    await dbClient.markProcessed(record.ID.value);
                }
            });

        } catch (error) {
            logger.error('Error during send: ', error.message);
            throw error;
        }
    }

    async function updateNomis(nomisId, staffId) {
        console.log('sending record to nomis, with nomisId: ' + nomisId + ' for staffid: ' + staffId);
        try {
            return await nomisClient.postComRelation(nomisId, staffId);
        } catch(error) {
            logger.warn('Error updating nomis: ' + error);
            return 'ERROR';
        }

    }

    return {fill, send};
};
