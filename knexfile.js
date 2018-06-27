const config = require('./server/config');

module.exports = {
    client: 'pg',
    connection: {
        server: config.db.server,
        port: config.db.port,
        user: config.db.username,
        password: config.db.password,
        database: config.db.database,
        ssl: config.db.sslEnabled === 'true'
    },
    acquireConnectionTimeout: 5000
};
