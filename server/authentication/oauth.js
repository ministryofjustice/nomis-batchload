const config = require('../config');
const querystring = require('querystring');

module.exports = {
    generateOauthClientToken,
    generateBatchSystemOauthClientToken
};

function generateOauthClientToken() {
    return generate(config.nomis.apiClientId, config.nomis.apiClientSecret);
}

function generateBatchSystemOauthClientToken() {
    return generate(config.nomis.batchsSystemApiClientId, config.nomis.batchSystemApiClientSecret);
}

function generate(clientId, clientSecret) {
    const token = new Buffer(
        `${querystring.escape(clientId)}:${querystring.escape(clientSecret)}`)
        .toString('base64');

    return `Basic ${token}`;
}
