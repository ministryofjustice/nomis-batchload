const parse = require('csv-parse');

module.exports = function(logger, dbClient) {

    function parseCsv(data, columns, delimiter) {

        return new Promise(async function(resolve, reject) {

            const parserConfig = {columns: true, delimiter: delimiter, skip_empty_lines: true};
            const parser = parse(parserConfig);

            const {connection, bulkload} = await dbClient.getStageBulkload();

            let addedCount = 0;

            parser.on('data', row => {
                bulkload.addRow(formatRow(columns, row));
                addedCount++;
            });

            parser.on('error', function(err) {
                logger.error('Error parsing CSV');
                return reject(err.message);
            });

            parser.on('finish', function() {
                connection.execBulkLoad(bulkload);
                return resolve(addedCount);
            });

            parser.write(data);
            parser.end();
        });
    }

    function formatRow(columns, row) {

        const nomis = row[columns.offenderNomis];
        const pnc = row[columns.offenderPnc];
        const staffId = row[columns.staffId];
        const staffFirst = nonemptyValueOrDefault(row[columns.staffFirst], staffId);
        const staffLast = nonemptyValueOrDefault(row[columns.staffLast], staffId);

        const record = [nomis, pnc, staffId, staffFirst, staffLast];

        return record.map(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 ? trimmed : null;
        });
    }

    function nonemptyValueOrDefault(value, defaultValue) {
         return value && value.length > 0 ? value : defaultValue;
    }

    return {parseCsv};
};
