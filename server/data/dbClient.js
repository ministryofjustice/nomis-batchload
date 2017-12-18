const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

const {
    connect
} = require('./dataAccess/db');

const logger = require('../../log.js');

module.exports = {

    stageCaseload: function(offenderNomis, offenderPnc, staffId, valid) {

        return new Promise((resolve, reject) => {
            const sql = 'IF NOT EXISTS (SELECT * FROM OM_RELATIONS_STAGING WHERE ' +
                'OFFENDER_NOMIS like @OFFENDER_NOMIS AND ' +
                'OFFENDER_PNC like @OFFENDER_PNC AND ' +
                'STAFF_ID like @STAFF_ID' + ') ' +
                'BEGIN INSERT INTO OM_RELATIONS_STAGING ' +
                '(OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID, VALID) ' +
                'VALUES (@OFFENDER_NOMIS, @OFFENDER_PNC, @STAFF_ID, @VALID) END';

            const parameters = [
                {column: 'OFFENDER_NOMIS', type: TYPES.VarChar, value: offenderNomis},
                {column: 'OFFENDER_PNC', type: TYPES.VarChar, value: offenderPnc},
                {column: 'STAFF_ID', type: TYPES.VarChar, value: staffId},
                {column: 'VALID', type: TYPES.Bit, value: valid}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    clearStaged: function() {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM OM_RELATIONS_STAGING`;
            execSql(sql, [], resolve, reject);
        });
    },

    getPending: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS WHERE PENDING = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getPendingCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS WHERE PENDING = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getRejected: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS WHERE REJECTED = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getRejectedCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS WHERE REJECTED = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedIncomplete: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS_STAGING WHERE VALID = 0`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedIncompleteCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE VALID = 0`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStaged: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS_STAGING WHERE VALID = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE VALID = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    findNomisId: function(pnc) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT OFFENDER_NOMIS FROM OM_RELATIONS WHERE OFFENDER_PNC like '${pnc}'`;
            getCollection(sql, null, resolve, reject);
        });
    },

    fillNomisId: function(recordId, nomisId) {
        return new Promise((resolve, reject) => {
            const sql =
                'UPDATE OM_RELATIONS_STAGING SET OFFENDER_NOMIS = @OFFENDER_NOMIS, VALID = 1, REJECTED = 0, ' +
                'REJECTION = null WHERE ID like @ID';

            const parameters = [
                {column: 'OFFENDER_NOMIS', type: TYPES.VarChar, value: nomisId},
                {column: 'ID', type: TYPES.VarChar, value: recordId}
            ];

            logger.info('Filling nomis id for record ID: ' + recordId + ' using nomisId: ' + nomisId);

            execSql(sql, parameters, resolve, reject);
        });
    },

    markFillRejected: function(recordId, rejection) {
        return new Promise((resolve, reject) => {
            const sql =
                'UPDATE OM_RELATIONS_STAGING SET VALID = 0, REJECTED = 1, REJECTION = @REJECTION WHERE ID like @ID';

            const parameters = [
                {column: 'ID', type: TYPES.VarChar, value: recordId},
                {column: 'REJECTION', type: TYPES.VarChar, value: rejection}
            ];

            logger.info('Marking as rejected for record ID: ' + recordId);

            execSql(sql, parameters, resolve, reject);
        });
    },

    markProcessed: function(recordId) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE OM_RELATIONS SET PENDING = 0, REJECTED = 0 WHERE ID like @ID';

            const parameters = [
                {column: 'ID', type: TYPES.VarChar, value: recordId}
            ];

            logger.info('Marking as processed for record ID: ' + recordId);

            execSql(sql, parameters, resolve, reject);
        });
    },

    markRejected: function(recordId, rejection) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE OM_RELATIONS SET PENDING = 1, REJECTED = 1, REJECTION = @REJECTION WHERE ID like @ID';

            const parameters = [
                {column: 'ID', type: TYPES.VarChar, value: recordId},
                {column: 'REJECTION', type: TYPES.VarChar, value: rejection}
            ];

            logger.info('Marking as rejected for record ID: ' + recordId);

            execSql(sql, parameters, resolve, reject);
        });
    },

    merge: function() {
        const updateExistingEntries = 'UPDATE OM_RELATIONS ' +
            'SET PENDING = 1, STAFF_ID = stage.STAFF_ID ' +
            'FROM OM_RELATIONS master ' +
            'INNER JOIN OM_RELATIONS_STAGING AS stage ' +
            'ON master.OFFENDER_NOMIS = stage.OFFENDER_NOMIS ' +
            'AND master.STAFF_ID <> stage.STAFF_ID ' +
            'AND stage.VALID = 1; ';

        const addNewEntries = 'INSERT INTO OM_RELATIONS (OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID, PENDING) ' +
            'SELECT OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID, 1 ' +
            'FROM OM_RELATIONS_STAGING stage ' +
            'WHERE VALID = 1 ' +
            'AND NOT EXISTS(SELECT 1 FROM OM_RELATIONS WHERE OFFENDER_NOMIS = stage.OFFENDER_NOMIS); ';

        const removeMergedEntries = 'DELETE FROM OM_RELATIONS_STAGING WHERE VALID = 1; ';

        return new Promise((resolve, reject) => {
            const sql = 'BEGIN TRANSACTION; ' +
                updateExistingEntries +
                addNewEntries +
                removeMergedEntries +
                'COMMIT;';

            execSql(sql, null, resolve, reject);
        });
    },

    getStageBulkload: function() {
        return new Promise((resolve, reject) => {
            const connection = connect();

            const bulkload = connection.newBulkLoad('OM_RELATIONS_STAGING', function(error, rowCount) {
                if (error) {
                    logger.error(error);
                    return reject(error);
                }

                logger.info('inserted %d rows', rowCount);
                return rowCount;
            });

            bulkload.addColumn('OFFENDER_NOMIS', TYPES.NVarChar, {length: 50, nullable: true});
            bulkload.addColumn('OFFENDER_PNC', TYPES.NVarChar, {length: 50, nullable: true});
            bulkload.addColumn('STAFF_ID', TYPES.NVarChar, {length: 50, nullable: true});
            bulkload.addColumn('VALID', TYPES.Bit, {nullable: true});

            connection.on('connect', error => {
                if (error) {
                    return reject(error);
                }
                return resolve({connection, bulkload});
            });
        });
    }
};
