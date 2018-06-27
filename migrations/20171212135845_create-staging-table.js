exports.up = knex =>
    Promise.all([
        knex.schema.createTableIfNotExists('om_relations_staging', table => {
            table.increments('id').primary('pk_om_relations_staging');
            table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
            table.string('offender_nomis', 50).nullable().unique();
            table.string('offender_pnc', 50).nullable();
            table.string('staff_id', 50).notNullable();
            table.string('staff_first', 250).nullable();
            table.string('staff_last', 250).nullable();
            table.string('rejection', 250).nullable();
            table.index(['staff_id', 'staff_first', 'staff_last', 'offender_nomis'], 'offender_mapping_staging');
        })
    ]);

exports.down = knex =>
    knex.schema.dropTable('om_relations_staging');
