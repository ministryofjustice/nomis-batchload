const modifyFunction = `
    create function timestamp_update_function()
    returns trigger as
    $$
    BEGIN
        NEW.timestamp = now();
        RETURN NEW;   
    END;
    $$ LANGUAGE plpgsql;
`;

const masterModifyTrigger = `
    create trigger timestamp_update_trigger
    before update on om_relations
    for each row
    execute procedure timestamp_update_function()
`;

exports.up = knex =>
    Promise.all([
        knex.raw(modifyFunction),
        knex.raw(masterModifyTrigger)
    ]);

exports.down = knex =>
    Promise.all([
        knex.raw('drop trigger timestamp_update_trigger on om_relations;'),
        knex.raw('drop function timestamp_update_function')
    ]);
