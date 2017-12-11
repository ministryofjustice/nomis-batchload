exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('CASELOAD_ERRORS', table => {
            table.increments('ID').primary('PK_CASELOAD_ERRORS');
            table.datetime('TIMESTAMP').notNullable().defaultTo(knex.fn.now());
            table.string('LINE', 50).notNullable();
            table.string('STAFF_ID', 50).nullable();
            table.string('OFFENDER_ID', 50).nullable();
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('CASELOAD_ERRORS');
