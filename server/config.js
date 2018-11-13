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
            offenderNomis: 'NOMS No',
            offenderPnc: 'PNC No',
            staffId: 'Staff Cd (OfM)',
            staffFirst: 'Staff First',
            staffLast: 'Staff Last'
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
        apiClientId: get('API_CLIENT_ID', 'licences'),
        apiClientSecret: get('API_CLIENT_SECRET', 'clientsecret'),
        batchsSystemApiClientId: get('ADMIN_API_CLIENT_ID', 'batchadmin'),
        batchSystemApiClientSecret: get('ADMIN_API_CLIENT_SECRET', 'clientsecret'),
        batchUserRole: get('BATCH_USER_ROLE', 'NOMIS_BATCHLOAD'),
        timeout: {
            response: get('RESPONSE_TIMEOUT', 35000),
            deadline: get('DEADLINE_TIMEOUT', 45000)
        },
        findNomisIdIntervalMillis: get('FINDNOMISID_INTERVAL_MILLIS', 500),
        sendRelationshipIntervalMillis: get('SENDRELATION_INTERVAL_MILLIS', 200)
    },

    audit: {
        max: 10
    },

    https: production,
    staticResourceCacheDuration: 365 * oneDay,
    healthcheckInterval: Number(get('HEALTHCHECK_INTERVAL', 0)),

    sessionSecret: get('SESSION_SECRET', 'nomis-batchload-insecure-default-session', {requireInProduction: true})
};
