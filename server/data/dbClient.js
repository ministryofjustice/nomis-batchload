const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

module.exports = {

    stageCaseload: function(offenderNomis, offenderPnc, staffId) {

        return new Promise((resolve, reject) => {
            const sql = 'IF NOT EXISTS (SELECT * FROM OM_RELATIONS_STAGING WHERE ' +
                'OFFENDER_NOMIS like @OFFENDER_NOMIS AND ' +
                'OFFENDER_PNC like @OFFENDER_PNC AND ' +
                'STAFF_ID like @STAFF_ID' + ') ' +
                'BEGIN INSERT INTO OM_RELATIONS_STAGING ' +
                '(OFFENDER_NOMIS, OFFENDER_PNC, STAFF_ID) VALUES (@OFFENDER_NOMIS, @OFFENDER_PNC, @STAFF_ID) END';

            const parameters = [
                {column: 'OFFENDER_NOMIS', type: TYPES.VarChar, value: offenderNomis},
                {column: 'OFFENDER_PNC', type: TYPES.VarChar, value: offenderPnc},
                {column: 'STAFF_ID', type: TYPES.VarChar, value: staffId}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    getPendingCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS WHERE VALID = 1 AND PENDING = 1`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getErrorsCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS WHERE VALID = 0`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedIncompleteCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE OFFENDER_NOMIS like ''`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getStagedCount: function() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS COUNT FROM OM_RELATIONS_STAGING WHERE NOT OFFENDER_NOMIS like ''`;
            getCollection(sql, null, resolve, reject);
        });
    }
};

