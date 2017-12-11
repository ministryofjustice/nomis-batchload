const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

module.exports = {

    addCaseload: function(line, staffid, offenderid, valid) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO CASELOADS (LINE, STAFF_ID, OFFENDER_ID, VALID) ' +
                'VALUES (@line, @staffid, @offenderid, @valid)';

            const parameters = [
                {column: 'line', type: TYPES.VarChar, value: line},
                {column: 'staffid', type: TYPES.VarChar, value: staffid},
                {column: 'offenderid', type: TYPES.VarChar, value: offenderid},
                {column: 'valid', type: TYPES.Bit, value: valid}
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
            const sql = `SELECT * FROM CASELOADS WHERE VALID = 0`;
            getCollection(sql, null, resolve, reject);
        });
    }
};


