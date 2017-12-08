exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('BATCHES', table => {
            table.increments('ID').primary('PK_BATCHES');
            table.datetime('TIMESTAMP').notNullable().defaultTo(knex.fn.now());
            table.string('FILENAME', 256).notNullable();
            table.string('USERID', 50).notNullable();
            table.string('STATUS', 50).notNullable();
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('BATCHES');
