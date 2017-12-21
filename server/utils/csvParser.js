const parse = require('csv-parse');

module.exports = function(logger, dbClient) {

    function parseCsv(data, columns, delimiter) {

        return new Promise(async function(resolve, reject) {

            const parserConfig = {columns: true, delimiter: delimiter, skip_empty_lines: true};
            const parser = parse(parserConfig);

            const {connection, bulkload} = await dbClient.getStageBulkload();

            let addedCount = 0;

            parser.on('data', record => {
                const selection = columns.map(column => record[column]);
                const data = selection.map(s => {
                    const trimmed = s.trim();
                    return trimmed.length > 0 ? trimmed : null;
                });
                bulkload.addRow(data[0], data[1], data[2]);
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

    return {parseCsv};
};
