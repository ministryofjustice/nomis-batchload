const parse = require('csv-parse');

module.exports = function(logger, dbClient, csvRowFormatter) {

    const parserConfig = {delimiter: ',', skip_empty_lines: true};

    function parseCsv(data) {

        return new Promise(function(resolve, reject) {

            const parser = parse(parserConfig);

            parser.on('readable', function() {
                let record;
                while (record = parser.read()) {
                    const {offenderNomis, offenderPnc, staffId, valid} = csvRowFormatter.format(record);
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
