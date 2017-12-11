const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

module.exports = {

    addCaseload: function(staffid, offenderid) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO CASELOADS (STAFF_ID, OFFENDER_ID) ' +
                'VALUES (@staffid, @offenderid)';

            const parameters = [
                {column: 'staffid', type: TYPES.VarChar, value: staffid},
                {column: 'offenderid', type: TYPES.VarChar, value: offenderid}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    addCaseloadError: function(line, staffid, offenderid) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO CASELOAD_ERRORS (LINE, STAFF_ID, OFFENDER_ID) ' +
                'VALUES (@line, @staffid, @offenderid)';

            const parameters = [
                {column: 'line', type: TYPES.VarChar, value: line},
                {column: 'staffid', type: TYPES.VarChar, value: staffid},
                {column: 'offenderid', type: TYPES.VarChar, value: offenderid}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    getPending: function(filename, user, status) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM CASELOADS`;
            getCollection(sql, null, resolve, reject);
        });
    },

    getErrors: function(filename, user, status) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM CASELOAD_ERRORS`;
            getCollection(sql, null, resolve, reject);
        });
    }
};

