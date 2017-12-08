const {getCollection, execSql} = require('./dataAccess/dbMethods');
const TYPES = require('tedious').TYPES;

module.exports = {

    addBatch: function(filename, userid, status) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO BATCHES (FILENAME, USERID, STATUS) ' +
                'VALUES (@filename, @userid, @status)';

            const parameters = [
                {column: 'filename', type: TYPES.VarChar, value: filename},
                {column: 'userid', type: TYPES.VarChar, value: userid},
                {column: 'status', type: TYPES.VarChar, value: status}
            ];

            execSql(sql, parameters, resolve, reject);
        });
    },

    getJobs: function(filename, user, status) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM BATCHES`;

            getCollection(sql, null, resolve, reject);
        });
    }
};

