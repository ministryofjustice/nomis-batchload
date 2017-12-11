exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('CASELOADS', table => {
            table.increments('ID').primary('PK_CASELOADS');
            table.datetime('TIMESTAMP').notNullable().defaultTo(knex.fn.now());
            table.string('LINE', 50).notNullable();
            table.string('STAFF_ID', 50).nullable();
            table.string('OFFENDER_ID', 50).nullable();
            table.bit('VALID').defaultTo(1);
            table.bit('REJECTED').defaultTo(0);
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('CASELOADS');
