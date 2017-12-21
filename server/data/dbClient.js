const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

const {
    connect
} = require('./dataAccess/db');

const logger = require('../../log.js');

module.exports = {

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

            connection.on('connect', error => {
                if (error) {
                    return reject(error);
                }
                return resolve({connection, bulkload});
            });
        });
    },

    clearStaged: function() {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM OM_RELATIONS_STAGING`;
            execSql(sql, [], resolve, reject);
        });
    },

    getStagedIncomplete: function() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS IS NULL ORDER BY ID';
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedIncompleteCount: function() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS IS NULL';
            getCollection(sql, null, resolve, reject);
        });
    },

    getStaged: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS IS NOT NULL`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS IS NOT NULL`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedPncs: function() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT OFFENDER_PNC FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS IS NULL ' +
                'AND OFFENDER_PNC IS NOT NULL';
            getCollection(sql, null, resolve, reject);
        });
    },

    copyNomisIdsFromMaster: function() {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE OM_RELATIONS_STAGING SET OFFENDER_NOMIS = m.OFFENDER_NOMIS FROM OM_RELATIONS m ' +
                'WHERE m.OFFENDER_PNC = OM_RELATIONS_STAGING.OFFENDER_PNC';

            execSql(sql, [], resolve, reject);
        });
    },

    fillNomisId: function(pnc, nomisId, rejection) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE OM_RELATIONS_STAGING SET OFFENDER_NOMIS = ' +
                '@OFFENDER_NOMIS, REJECTION = @REJECTION WHERE OFFENDER_PNC = @OFFENDER_PNC';

            const parameters = [
                {column: 'OFFENDER_PNC', type: TYPES.VarChar, value: pnc},
                {column: 'OFFENDER_NOMIS', type: TYPES.VarChar, value: nomisId},
                {column: 'REJECTION', type: TYPES.VarChar, value: rejection}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    mergeStageToMaster: function() {
        const updateExistingEntries = 'UPDATE OM_RELATIONS ' +
            'SET PENDING = 1, STAFF_ID = stage.STAFF_ID ' +
            'FROM OM_RELATIONS master ' +
            'INNER JOIN OM_RELATIONS_STAGING AS stage ' +
            'ON master.OFFENDER_NOMIS = stage.OFFENDER_NOMIS ' +
            'AND master.STAFF_ID <> stage.STAFF_ID ' +
            'AND stage.OFFENDER_NOMIS IS NOT NULL ' +
            'AND stage.STAFF_ID IS NOT NULL; ';

        const addNewEntries = 'INSERT INTO OM_RELATIONS (OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID, PENDING) ' +
            'SELECT OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID, 1 ' +
            'FROM OM_RELATIONS_STAGING stage ' +
            'WHERE stage.OFFENDER_NOMIS IS NOT NULL ' +
            'AND stage.STAFF_ID IS NOT NULL ' +
            'AND NOT EXISTS(SELECT 1 FROM OM_RELATIONS WHERE OFFENDER_NOMIS = stage.OFFENDER_NOMIS); ';

        const removeMergedEntries = 'DELETE FROM OM_RELATIONS_STAGING WHERE ' +
            'OFFENDER_NOMIS IS NOT NULL ' +
            'AND STAFF_ID IS NOT NULL; ';

        return new Promise((resolve, reject) => {
            const sql = 'BEGIN TRANSACTION; ' +
                updateExistingEntries +
                addNewEntries +
                removeMergedEntries +
                'COMMIT;';

            execSql(sql, null, resolve, reject);
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

    updateWithNomisResult: function(recordId, rejection) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE OM_RELATIONS SET PENDING = 0, REJECTION = @REJECTION WHERE ID like @ID';

            const parameters = [
                {column: 'ID', type: TYPES.VarChar, value: recordId},
                {column: 'REJECTION', type: TYPES.VarChar, value: rejection}
            ];

            logger.info('Marking as processed for record ID: ' + recordId);

            execSql(sql, parameters, resolve, reject);
        });
    },

    getRejected: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM OM_RELATIONS WHERE REJECTION IS NOT NULL`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getRejectedCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS WHERE REJECTION IS NOT NULL`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getAudit: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM AUDIT`;
            getCollection(sql, null, resolve, reject);
        });
    }
};
