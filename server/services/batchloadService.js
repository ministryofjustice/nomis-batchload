const logger = require('../../log.js');
const async = require("async");

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
        console.log(result);

        const pncs = await dbClient.getPncs();
        console.log(pncs);

        const pncToNomis = await getNomisIds(pncs.map(p => p.OFFENDER_PNC.value));
        console.log(pncToNomis);

        const result2 = await fillNomisIdsFromNomis(pncToNomis);
        console.log(result2);

        console.log('stop filling');
    }

    async function getNomisIds(pncs) {
        console.log('getNomisIds');
        return {
            'pnc6': {
                id: 'nomis'
            },
            'pnc7': {
                rejection: '404'
            }
        };
    }

    async function fillNomisIdsFromNomis(pncToNomis) {
        console.log('fillNomisIds');

        const {connection, bulkload} = await dbClient.getApiResultsBulkload();

        Object.keys(pncToNomis).forEach(pnc => {
            const nomisId = pncToNomis[pnc].id || null;
            const rejection = pncToNomis[pnc].rejection || null;

            console.log(nomisId);
            bulkload.addRow(pnc, nomisId, rejection);
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
