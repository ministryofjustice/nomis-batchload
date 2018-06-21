const createApp = require('./app');
const logger = require('../log');

const TokenStore = require('./authentication/tokenStore');
const tokenStore = new TokenStore();

const nomisClientBuilder = require('./data/nomisClientBuilder');
const dbClient = require('./data/dbClient');
const audit = require('./data/audit');

const createSignInService = require('./authentication/signInService');
const createBatchloadService = require('./services/batchloadService');
const createCsvParser = require('./utils/csvParser');

const signInService = createSignInService(tokenStore);
const batchloadService = createBatchloadService(nomisClientBuilder(tokenStore, signInService), dbClient, audit);
const csvParser = createCsvParser(logger, dbClient);

const app = createApp({
    logger,
    signInService,
    batchloadService,
    dbClient,
    csvParser,
    audit,
    tokenStore
});

module.exports = app;
