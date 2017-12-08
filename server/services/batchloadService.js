const logger = require('../../log.js');

module.exports = function createBatchloadService(nomisClientBuilder, dbClient) {

    async function doThings(user) {

        try {
            const nomisClient = nomisClientBuilder(user.token);
            const stuff = await nomisClient.doStuff();

            return stuff;

        } catch (error) {
            logger.error('Error during doThings: ', error.message);
            throw error;
        }
    }

    return {doThings};
};
