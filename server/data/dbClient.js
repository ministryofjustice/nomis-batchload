const config = require('../../knexfile.js');
const knex = require('knex')(config);

module.exports = {

    stageCaseload: function(offenderNomis, offenderPnc, staffId) {
        knex('OM_RELATIONS_STAGING').insert({
            OFFENDER_NOMIS: offenderNomis,
            OFFENDER_PNC: offenderPnc,
            STAFF_ID: staffId
        }).then(function() {
            return;
        }).catch(function(err) {
            console.error(err);
            return err;
        });
    },

    getPending: function() {
        return knex('OM_RELATIONS').select('*').where({VALID: '1', PENDING: '1'})
            .then(function(rows) {
                return rows;
            })
            .catch(function(err) {
                console.error(err);
                return err;
            });
    },

    getErrors: function() {
        return knex('OM_RELATIONS').select('*').where({VALID: '0'})
            .then(function(rows) {
                return rows;
            })
            .catch(function(err) {
                console.error(err);
                return err;
            });
    },

    mergeStagingToMaster: function() {
        // todo
    }
};

