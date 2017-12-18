const parse = require('csv-parse');
const config = require('../config');

module.exports = function(logger, dbClient, csvRowFormatter) {

    const parserConfig = {columns: true, delimiter: config.csv.delimiter, skip_empty_lines: true};
    const columns = config.csv.columns;

    function parseCsv(data) {

        return new Promise(function(resolve, reject) {

            const parser = parse(parserConfig);

            parser.on('readable', function() {
                let record;
                while (record = parser.read()) {
                    const selection = columns.map(column => record[column]);
                    const {offenderNomis, offenderPnc, staffId, valid} = csvRowFormatter.format(selection);
                    dbClient.stageCaseload(offenderNomis, offenderPnc, staffId, valid);
                }
            });

            parser.on('error', function(err) {
                return reject(err.message);
            });

            parser.on('finish', function() {
                return resolve(parser.lines);
            });

            parser.write(data);
            parser.end();
        });
    }

    return {parseCsv};
};
