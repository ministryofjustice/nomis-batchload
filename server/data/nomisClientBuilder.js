const config = require('../config');
const logger = require('../../log.js');

const superagent = require('superagent');

const generateApiGatewayToken = require('../authentication/apiGateway');

const timeoutSpec = {
    response: config.nomis.timeout.response,
    deadline: config.nomis.timeout.deadline
};

const apiUrl = config.nomis.apiUrl;

module.exports = function(token) {
    return {
        doStuff: function() {
            nomisGet();
            return 'some stuff from ' + apiUrl;
        }
    };
};

async function nomisGet(path, query, token, headers = {}) {

    try {
        const gwToken = `Bearer ${generateApiGatewayToken()}`;

        const result = await superagent
            .get(path)
            .query(query)
            .set('Accept', 'application/json')
            .set('Authorization', gwToken)
            .set('Elite-Authorization', token)
            .set(headers)
            .timeout(timeoutSpec);

        return result.body;

    } catch(exception) {
        logger.error('Error from NOMIS: ' + exception);
        throw exception;
    }
}
