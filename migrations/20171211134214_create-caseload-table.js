exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('CASELOADS', table => {
            table.increments('ID').primary('PK_CASELOADS');
            table.datetime('TIMESTAMP').notNullable().defaultTo(knex.fn.now());
            table.string('STAFF_ID', 50).notNullable();
            table.string('OFFENDER_ID', 50).notNullable();
            table.string('STATUS', 50).nullable();
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('CASELOADS');
