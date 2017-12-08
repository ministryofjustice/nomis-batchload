const createApp = require('./app');
const logger = require('../log');

const nomisClientBuilder = require('./data/nomisClientBuilder');
const dbClient = require('./data/dbClient');

const createSignInService = require('./authentication/signIn');
const createBatchloadService = require('./services/batchloadService');

const signInService = createSignInService();
const batchloadService = createBatchloadService(nomisClientBuilder, dbClient);

const app = createApp({
    logger,
    signInService,
    batchloadService
});

module.exports = app;
