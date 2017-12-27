exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('OM_RELATIONS', table => {
            table.increments('ID').primary('PK_OM_RELATIONS');
            table.datetime('TIMESTAMP').notNullable().defaultTo(knex.fn.now());
            table.string('OFFENDER_NOMIS', 50).nullable();
            table.string('OFFENDER_PNC', 50).nullable();
            table.string('STAFF_ID', 50).nullable();
            table.string('STAFF_FIRST', 250).nullable();
            table.string('STAFF_LAST', 250).nullable();
            table.bit('PENDING').defaultTo(1);
            table.string('REJECTION', 250).nullable();
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('OM_RELATIONS');
