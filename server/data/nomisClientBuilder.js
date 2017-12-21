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
        getNomisIdForPnc: function(pnc) {
            const path = `${apiUrl}/prisoners`;
            const query = {pncNumber: pnc};
            return nomisGet(path, query, token);
        },

        postComRelation: function(nomisId, staffId, firstName, lastName) {
            const path = `${apiUrl}/bookings/offenderNo/${nomisId}/relationships`;
            const body = {
                externalRef: staffId,
                relationshipType: 'COM',
                firstName,
                lastName
            };
            return nomisPost(path, body, token);
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

    } catch (error) {
        logger.error('Error from NOMIS: ' + error);
        logger.info(error.status);
        logger.info(error.response.body);
        throw error;
    }
}

async function nomisPost(path, body, token, headers = {}) {

    try {
        const gwToken = `Bearer ${generateApiGatewayToken()}`;

        const result = await superagent
            .post(path)
            .send(body)
            .set('Accept', 'application/json')
            .set('Authorization', gwToken)
            .set('Elite-Authorization', token)
            .set(headers)
            .timeout(timeoutSpec);

        return result.status;

    } catch (error) {
        logger.error('Error from NOMIS: ' + error);
        logger.info(error.status);
        logger.info(error.response.body);
        throw error;
    }
}
