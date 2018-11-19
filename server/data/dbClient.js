const db = require('./dataAccess/db');
const copyFrom = require('pg-copy-streams').from;
const {Readable} = require('stream');

const logger = require('../../log.js');

module.exports = {

    clearUpload: function() {
        return db.query(`delete from om_relations_load`);
    },

    clearMaster: function() {
        return db.query(`delete from om_relations`);
    },

    getCompleteCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load
                         where offender_nomis is not null
                           and staff_id is not null
                           and staff_first is not null
                           and staff_last is not null`);
    },

    getValidCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load
                         where not
                                   (offender_nomis is null and offender_pnc is null)
                           and not
                                   (staff_id is null or staff_first is null or staff_last is null)
        `);
    },

    getValid: function() {
        return db.query(`select *
                         from om_relations_load
                         where not
                                   (offender_nomis is null and offender_pnc is null)
                           and not
                                   (staff_id is null or staff_first is null or staff_last is null)
        `);
    },

    getInvalidCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load
                         where (offender_nomis is null and offender_pnc is null)
                            or (staff_id is null or staff_first is null or staff_last is null)
        `);
    },

    getInvalid: function() {
        return db.query(`select *
                         from om_relations_load
                         where (offender_nomis is null and offender_pnc is null)
                            or (staff_id is null or staff_first is null or staff_last is null)
                         order by staff_id
        `);
    },

    removeInvalid: function() {
        return db.query(`delete from om_relations_load
                         where (offender_nomis is null and offender_pnc is null)
                            or (staff_id is null or staff_first is null or staff_last is null)
        `);
    },

    getDuplicateCount: function() {
        return db.query(`select count(*)
                         from (select offender_nomis
                               from om_relations_load
                               group by offender_nomis
                               having count(offender_nomis) > 1) as duplicates
        `);
    },

    getDuplicate: function() {
        return db.query(`select *
                         from om_relations_load
                         where offender_nomis in
                               (select offender_nomis from om_relations_load group by offender_nomis having count(offender_nomis) > 1)
                         order by offender_nomis ASC
        `);
    },

    removeDuplicate: function() {
        return db.query(`delete from om_relations_load
                         where offender_nomis in
                               (select offender_nomis from om_relations_load group by offender_nomis having count(offender_nomis) > 1)`);
    },

    getIncompleteCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load
                         where offender_nomis is null
                           and offender_pnc is not null
                           and staff_id is not null
                           and staff_first is not null
                           and staff_last is not null`);
    },

    getIncomplete: function() {
        return db.query(`select *
                         from om_relations_load
                         where offender_nomis is null
                           and offender_pnc is not null
                           and staff_id is not null
                           and staff_first is not null
                           and staff_last is not null
                         order by id`);
    },

    getFillRejectedCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load
                         where rejection is not null`);
    },

    remove404: function() {
        return db.query(`delete from om_relations_load
                         where rejection like '404%'`);
    },

    remove404master: function() {
        return db.query(`delete from om_relations
                         where rejection like '404%'`);
    },

    resetErrors: function() {
        return db.query(`update om_relations
                         set rejection = null where rejection not like '404%'`);
    },

    getUploadedCount: function() {
        return db.query(`select count(*) as count
                         from om_relations_load`);
    },

    getUploaded: function() {
        return db.query(`select *
                         from om_relations_load`);
    },

    getMaster: function() {
        return db.query(`select *
                         from om_relations`);
    },

    getStagedPncs: function() {
        return db.query(`select offender_pnc
                         from om_relations_load
                         where offender_nomis is null
                           and offender_pnc is not null
                           and staff_id is not null
                           and staff_first is not null
                           and staff_last is not null
                           `);
    },

    copyNomisIdsFromMaster: function() {
        return db.query(`update om_relations_load
                         set offender_nomis = m.offender_nomis
                         from om_relations m
                         where m.offender_pnc = om_relations_load.offender_pnc`);
    },

    fillNomisId: function(pnc, nomisId, rejection) {
        const query = {
            text: 'update om_relations_load set offender_nomis = $1, rejection = $2 where offender_pnc = $3',
            values: [nomisId, rejection, pnc]
        };

        return db.query(query);
    },

    getPending: function() {
        return db.query(`select *
                         from om_relations
                         where pending = true and (rejection is null or rejection not like '404%')`);
    },

    get404: function() {
        return db.query(`select *
                         from om_relations
                         where pending = true and rejection like '404%'`);
    },

    setPending: function() {
        return db.query(`update om_relations
                         set pending = true`);
    },

    getPendingCount: function() {
        return db.query(`select count(*) as count
                         from om_relations
                         where pending = true`);
    },

    updateWithNomisResult: function(recordId, rejection) {
        const query = {
            text: 'update om_relations set pending = $1, rejection = $2 where id = $3',
            values: [rejection ? true : false, rejection, recordId]
        };

        return db.query(query);
    },

    getRejected: function() {
        return db.query(`select *
                         from om_relations
                         where rejection is not null`);
    },

    getRejectedCount: function() {
        return db.query(`select count(*) as count
                         from om_relations
                         where rejection is not null`);
    },

    getSentCount: function() {
        return db.query(`select count(*) as count
                         from om_relations
                         where pending = false`);
    },

    getAudit: function(maxCount) {
        return db.query(`select *
                         from audit
                         order by timestamp desc limit ${maxCount}`);
    },

    mergeStageToMaster: function() {

        const updateExistingEntries = `insert into om_relations (offender_nomis, offender_pnc, staff_id, staff_first, staff_last, pending)
                                       select stage.offender_nomis,
                                              stage.offender_pnc,
                                              stage.staff_id,
                                              stage.staff_first,
                                              stage.staff_last,
                                              true
                                       from om_relations_load stage
                                       where stage.offender_nomis is not null
                                         and stage.staff_id is not null
            on conflict(offender_nomis) do update set pending = true, staff_id = excluded.staff_id,
            staff_first = excluded.staff_first, staff_last = excluded.staff_last
            where (om_relations.staff_id <> excluded.staff_id
            or om_relations.staff_first <> excluded.staff_first
            or om_relations.staff_last <> excluded.staff_last
            ); `;

        const addNewEntries = 'insert into om_relations (offender_nomis, offender_pnc, staff_id, ' +
            'staff_first, staff_last, pending) ' +
            'select offender_nomis, offender_pnc, staff_id, ' +
            'staff_first, staff_last, true ' +
            'from om_relations_load stage ' +
            'where stage.offender_nomis is not null ' +
            'and stage.staff_id is not null ' +
            'and not exists(select 1 from om_relations where offender_nomis = stage.offender_nomis); ';

        const removeMergedEntries = 'delete from om_relations_load where ' +
            'offender_nomis is not null ' +
            'and staff_id is not null; ';

        return db.query('begin transaction; ' +
            updateExistingEntries +
            addNewEntries +
            removeMergedEntries +
            'commit;');
    },

    bulkInsert: data => {

        return new Promise((resolve, reject) => {

            db.pool.connect().then(client => {

                const stream = client.query(copyFrom(`copy om_relations_load (offender_nomis, offender_pnc, 
                staff_id, staff_first, staff_last) from stdin with NULL 'null'`));

                const rs = new Readable;
                let currentIndex = 0;

                rs._read = function() {
                    if (currentIndex === data.length) {
                        rs.push(null);
                    } else {
                        const row = data[currentIndex];
                        const entry = row[0] + '\t' + row[1] + '\t' + row[2] + '\t' + row[3] + '\t' + row[4] + '\n';
                        rs.push(entry);
                        currentIndex = currentIndex + 1;
                    }
                };

                rs.on('error', error => {
                    logger.error(error);
                    return reject(error);
                });

                stream.on('error', error => {
                    logger.error(error);
                    return reject(error);
                });

                stream.on('end', () => {
                    logger.info('Done');
                    return resolve(currentIndex);
                });

                rs.pipe(stream);
            });
        });
    }
};
