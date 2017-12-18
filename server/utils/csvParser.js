const parse = require('csv-parse');

module.exports = function(logger, dbClient, csvRowFormatter) {

    function parseCsv(data, columns, delimiter) {

        return new Promise(async function(resolve, reject) {

            const parserConfig = {columns: true, delimiter: delimiter, skip_empty_lines: true};
            const parser = parse(parserConfig);

            const {connection, bulkload} = await dbClient.getStageBulkload();

            parser.on('data', record => {
                const selection = columns.map(column => record[column]);
                const {offenderNomis, offenderPnc, staffId, valid} = csvRowFormatter.format(selection);
                bulkload.addRow(offenderNomis, offenderPnc, staffId, valid);
            });

            parser.on('error', function(err) {
                logger.error('Error parsing CSV');
                return reject(err.message);
            });

            parser.on('finish', function() {
                const insertedCount = connection.execBulkLoad(bulkload);
                logger.info('Bulk uploaded count: ' + insertedCount);
                return resolve(insertedCount);
            });

            parser.write(data);
            parser.end();
        });
    }

    return {parseCsv};
};
