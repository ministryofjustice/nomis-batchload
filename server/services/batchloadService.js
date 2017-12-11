const logger = require('../../log.js');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    async function send() {

        try {

            console.log('sending to nomis');

            const systemUserToken = 'todo';
            const nomisClient = nomisClientBuilder(systemUserToken);

            // todo get pending records
            const pending = await dbClient.getPending();

            console.log(pending);

            // send to nomis
            await nomisClient.doStuff();

            // remove succeeded
            // mark failed

        } catch (error) {
            logger.error('Error during send: ', error.message);
            throw error;
        }
    }

    return {send};
};
