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
        database: get('DB_NAME', 'nomisbatch')
    },

    nomis: {
        apiUrl: get('NOMIS_API_URL', 'http://localhost:9090/elite2api'),
        apiGatewayToken: get('NOMIS_GW_TOKEN', 'dummy'),
        apiGatewayPrivateKey: new Buffer(get('NOMIS_GW_KEY', 'dummy'), 'base64').toString('ascii'),
        timeout: {
            response: 2000,
            deadline: 2500
        },
        getRateLimit: 1000,
        postRateLimit: 2000
    },

    roles: {
        batchUser: get('BATCH_USER_ROLES', ['XYZ_SOMETHING_BATCH']),
        systemUser: get('BATCH_SYSTEM_USER_ROLES', ['XYZ_SOMETHING_BATCH_SYSTEM'])
    },

    systemUser: {
        username: get('BATCH_SYSTEM_USER', 'BATCH_SYSTEM'),
        password: get('BATCH_SYSTEM_PASSWORD', 'systempass')
    },

    audit: {
        max: 10
    },

    https: production,
    staticResourceCacheDuration: 365 * oneDay,
    healthcheckInterval: Number(get('HEALTHCHECK_INTERVAL', 0)),

    sessionSecret: get('SESSION_SECRET', 'nomis-batchload-insecure-default-session', {requireInProduction: true})
};
