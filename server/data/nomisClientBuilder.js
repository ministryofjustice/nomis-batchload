const config = require('../config');
const superagent = require('superagent');
const generateApiGatewayToken = require('../authentication/apiGateway');

const timeoutSpec = {
    response: config.nomis.timeout.response,
    deadline: config.nomis.timeout.deadline
};

const apiUrl = config.nomis.apiUrl;

module.exports = (tokenStore, signInService) => username => {

    const nomisGet = nomisGetBuilder(tokenStore, signInService, username);
    const nomisPost = nomisPostBuilder(tokenStore, signInService, username);

    return {
        getNomisIdForPnc: function(pnc) {
            const path = `${apiUrl}/prisoners`;
            const query = {pncNumber: pnc};
            return nomisGet({path, query});
        },

        postComRelation: function(nomisId, staffId, firstName, lastName) {
            const path = `${apiUrl}/bookings/offenderNo/${nomisId}/relationships`;
            const body = {
                externalRef: staffId,
                relationshipType: 'COM',
                firstName,
                lastName
            };
            return nomisPost({path, body});
        }
    };
};

function nomisGetBuilder(tokenStore, signInService, username) {

    return async ({path, query = '', headers = {}, responseType = ''} = {}) => {

        const tokens = tokenStore.get(username);

        if (!tokens) {
            throw new Error('no token');
        }

        try {
            const result = await superagent
                .get(path)
                .query(query)
                .set('Authorization', gatewayTokenOrCopy(tokens.token))
                .set('Elite-Authorization', tokens.token)
                .set(headers)
                .responseType(responseType)
                .timeout(timeoutSpec);

            return result.body;

        } catch (error) {
            if (canRetry(error, tokens)) {
                return refreshAndRetry(username, {path, query, headers, responseType});
            }

            throw error;
        }
    };

    function canRetry(error, tokens) {
        const unauthorisedError = [400, 401, 403].includes(error.status);
        const refreshAllowed = Date.now() - tokens.timestamp >= 5000;

        return unauthorisedError && refreshAllowed;
    }

    async function refreshAndRetry(username, {path, query, headers, responseType}) {

        await signInService.refresh(username);

        const nomisGet = nomisGetBuilder(tokenStore, signInService, username);
        return nomisGet({path, query, headers, responseType});
    }
}

function nomisPostBuilder(tokenStore, signInService, username) {

    return async ({path, body = {}, headers = {}, responseType = ''} = {}) => {

        const tokens = tokenStore.get(username);

        if (!tokens) {
            throw new Error('no token');
        }

        try {
            const result = await superagent
                .post(path)
                .send(body)
                .set('Accept', 'application/json')
                .set('Authorization', gatewayTokenOrCopy(tokens.token))
                .set('Elite-Authorization', tokens.token)
                .set(headers)
                .responseType(responseType)
                .timeout(timeoutSpec);

            return result.body;

        } catch (error) {
            if (canRetry(error, tokens)) {
                return refreshAndRetryPost(username, {path, body, headers, responseType});
            }

            throw error;
        }
    };

    function canRetry(error, tokens) {
        const unauthorisedError = [400, 401, 403].includes(error.status);
        const refreshAllowed = Date.now() - tokens.timestamp >= 5000;

        return unauthorisedError && refreshAllowed;
    }

    async function refreshAndRetryPost(username, {path, body, headers, responseType}) {

        await signInService.refresh(username);

        const nomisPost = nomisPostBuilder(tokenStore, signInService, username);
        return nomisPost({path, body, headers, responseType});
    }
}

function gatewayTokenOrCopy(token) {
    return config.nomis.apiGatewayEnabled === 'yes' ? generateApiGatewayToken() : token;
}
