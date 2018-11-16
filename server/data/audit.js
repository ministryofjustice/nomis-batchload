const logger = require('../../log');
const db = require('./dataAccess/db');

const keys = [
    'LOGIN',
    'UPLOAD_STARTED',
    'UPLOAD_DONE',
    'CLEAR_UPLOAD',
    'CLEAR_MASTER',
    'FILL_STARTED',
    'FILL_STOPPED',
    'FILL_DONE',
    'MERGE',
    'SEND_STARTED',
    'SEND_STOPPED',
    'SEND_DONE',
    'REMOVE_INVALID',
    'REMOVE_DUPLICATE',
    'REMOVE_404',
    'SET_PENDING'
];

exports.record = function record(key, user, data) {

    if (!keys.includes(key)) {
        throw new Error(`Unknown audit key: ${key}`);
    }

    logger.audit('AUDIT', {key});

    return addItem(key, user, data)
        .then(id => {
            logger.info('Audit item inserted', id);
        })
        .catch(error => {
            logger.error('Error during audit insertion ', error);
        });
};

function addItem(key, user, data) {
    const query = {
        text: `insert into audit ("user", action, details) values ($1, $2, $3);`,
        values: [user, key, data]
    };

    return db.query(query);
}
