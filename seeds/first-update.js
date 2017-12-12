
exports.seed = function(knex, Promise) {
    // Deletes ALL existing entries
    return knex('OM_RELATIONS_STAGING').del()
        .then(function () {
            // Inserts seed entries
            return knex('OM_RELATIONS_STAGING').insert([
                {OFFENDER_NOMIS: 'nomis1', OFFENDER_PNC: 'pnc1', STAFF_ID: 'staff1'},
                {OFFENDER_NOMIS: 'nomis2', OFFENDER_PNC: 'pnc2', STAFF_ID: 'staff2'},
                {OFFENDER_NOMIS: 'nomis3', OFFENDER_PNC: 'pnc3a', STAFF_ID: 'staff1'},
                {OFFENDER_NOMIS: 'nomis4', OFFENDER_PNC: 'pnc4', STAFF_ID: 'staff1'},
                {OFFENDER_NOMIS: 'nomis5', OFFENDER_PNC: 'pnc5', STAFF_ID: 'staff1'},
                {OFFENDER_NOMIS: 'nomis6', OFFENDER_PNC: 'pnc6', STAFF_ID: 'staff3'}
            ]);
        });
};
