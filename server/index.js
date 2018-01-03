const createApp = require('./app');
const logger = require('../log');
const config = require('./config');

const nomisClientBuilder = require('./data/nomisClientBuilder');
const dbClient = require('./data/dbClient');

const createSignInService = require('./authentication/signIn');
const createBatchloadService = require('./services/batchloadService');
const {NomisWrapper} = require('./services/nomisWrapper');

const createCsvParser = require('./utils/csvParser');

const audit = require('./data/audit');
const signInService = createSignInService();

const systemUserInfo = {
    name: config.systemUser.username,
    pass: config.systemUser.password,
    roles: config.roles.systemUser
};

const wrappedNomisClient = new NomisWrapper(nomisClientBuilder, signInService, systemUserInfo);
const batchloadService = createBatchloadService(wrappedNomisClient, dbClient, audit);
const csvParser = createCsvParser(logger, dbClient);

const app = createApp({
    logger,
    signInService,
    batchloadService,
    dbClient,
    csvParser,
    audit
});

module.exports = app;
