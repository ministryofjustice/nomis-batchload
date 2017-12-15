const createApp = require('./app');
const logger = require('../log');

const nomisClientBuilder = require('./data/nomisClientBuilder');
const dbClient = require('./data/dbClient');

const createSignInService = require('./authentication/signIn');
const createBatchloadService = require('./services/batchloadService');

const csvRowFormatter = require('./utils/csvRowFormatter');
const createCsvParser = require('./utils/csvParser');

const signInService = createSignInService();
const batchloadService = createBatchloadService(nomisClientBuilder, dbClient);
const csvParser = createCsvParser(logger, dbClient, csvRowFormatter);

const app = createApp({
    logger,
    signInService,
    batchloadService,
    dbClient,
    csvParser
});

module.exports = app;
