require('dotenv').config();
const production = process.env.NODE_ENV === 'production';
const oneDay = 24 * 60 * 60;

function get(name, fallback, options = {}) {
    if (process.env[name]) {
        return process.env[name];
    }
    if (fallback !== undefined && (!production || !options.requireInProduction)) {
        return fallback;
    }
    throw new Error('Missing env var ' + name);
}

module.exports = {

    version: 0.1,

    csv: {
        columns: {
            offenderNomis: 'NOMS_NUMBER',
            offenderPnc: 'PNC_NUMBER',
            staffId: 'OFFICER_CODE',
            staffFirst: 'FORENAME',
            staffLast: 'SURNAME'
        },
        delimiter: ','
    },

    db: {
        username: get('DB_USER', 'user'),
        password: get('DB_PASS', 'password'),
        server: get('DB_SERVER', 'server'),
        port: get('DB_PORT', 5432),
        database: get('DB_NAME', 'nomisbatch'),
        sslEnabled: get('DB_SSL_ENABLED', 'true')
    },

    nomis: {
        apiUrl: get('NOMIS_API_URL', 'http://localhost:9090/elite2api'),
        apiGatewayEnabled: get('API_GATEWAY_ENABLED', 'no'),
        apiGatewayToken: get('NOMIS_GW_TOKEN', 'dummy'),
        apiGatewayPrivateKey: new Buffer(get('NOMIS_GW_KEY', 'dummy'), 'base64').toString('ascii'),
        licenceRolePrefix: get('LICENCE_ROLE_PREFIX', 'LICENCE'),
        apiClientId: get('API_CLIENT_ID', 'licences'),
        apiClientSecret: get('API_CLIENT_SECRET', 'clientsecret'),
        batchsSystemApiClientId: get('ADMIN_API_CLIENT_ID', 'batchadmin'),
        batchSystemApiClientSecret: get('ADMIN_API_CLIENT_SECRET', 'clientsecret'),
        batchUserRole: get('BATCH_USER_ROLE', 'NOMIS_BATCHLOAD'),
        timeout: {
            response: 2000,
            deadline: 2500
        },
        getRateLimit: 200,
        postRateLimit: 200
    },

    audit: {
        max: 10
    },

    https: production,
    staticResourceCacheDuration: 365 * oneDay,
    healthcheckInterval: Number(get('HEALTHCHECK_INTERVAL', 0)),

    sessionSecret: get('SESSION_SECRET', 'nomis-batchload-insecure-default-session', {requireInProduction: true})
};
