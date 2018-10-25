const parse = require('csv-parse');

module.exports = function(logger, dbClient) {

    function parseCsv(data, columns, delimiter) {

        return new Promise(async function(resolve, reject) {

            const parserConfig = {columns: true, delimiter: delimiter, skip_empty_lines: true};
            const parser = parse(parserConfig);

            let addedCount = 0;
            let records = [];

            parser.on('data', row => {
                records.push(formatRow(columns, row));
                addedCount++;
            });

            parser.on('error', function(err) {
                logger.error('Error parsing CSV');
                return reject(err.message);
            });

            parser.on('finish', async function() {

                const lineCount = parser.lines;
                const recordCount = parser.count;

                logger.info('Number of lines in file: ' + lineCount);
                logger.info('Number of records parsed: ' + recordCount);

                try {
                    const result = await dbClient.bulkInsert(records);
                    logger.info('bulkinsert result:');
                    logger.info(result);

                } catch(error) {
                    logger.error('bulkinsert error:');
                    logger.error(error);
                    reject(error);
                }

                return resolve({lineCount, recordCount, addedCount});
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
            const trimmed = s ? s.trim() : '';
            return trimmed.length > 0 ? trimmed : null;
        });
    }

    function nonemptyValueOrDefault(value, defaultValue) {
         return value && value.length > 0 ? value : defaultValue;
    }

    return {parseCsv};
};
