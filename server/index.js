const createApp = require('./app');
const logger = require('../log');

const nomisClientBuilder = require('./data/nomisClientBuilder');
const dbClient = require('./data/dbClient');

const createSignInService = require('./authentication/signIn');
const createBatchloadService = require('./services/batchloadService');

const createCsvParser = require('./utils/csvParser');

const audit = require('./data/audit');
const signInService = createSignInService();
const batchloadService = createBatchloadService(nomisClientBuilder, dbClient, audit);
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
