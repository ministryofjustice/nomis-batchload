exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('OM_RELATIONS_API_RESULT', table => {
            table.string('OFFENDER_PNC', 50).nullable();
            table.string('OFFENDER_NOMIS', 50).nullable();
            table.string('REJECTION', 250).nullable();
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('OM_RELATIONS_API_RESULT');
