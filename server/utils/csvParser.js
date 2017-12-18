const parse = require('csv-parse');


module.exports = function(logger, dbClient, csvRowFormatter) {


    function parseCsv(data, columns, delimiter) {

        return new Promise(function(resolve, reject) {

            const parserConfig = {columns: true, delimiter: delimiter, skip_empty_lines: true};
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
