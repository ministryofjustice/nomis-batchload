const {
    sandbox,
    expect
} = require('../testSetup');

const loggerStub = {
    debug: sandbox.stub()
};

const createCsvParser = require('../../server/utils/csvParser');
const csvRowFormatter = require('../../server/utils/csvRowFormatter');

const dbClient = {
    stageCaseload: sandbox.stub().returnsPromise().returnsPromise().resolves()
};

const {
    parseCsv
} = createCsvParser(loggerStub, dbClient, csvRowFormatter);

function bufferFrom(data) {
    return Buffer.from(data, 'utf8');
}

describe('csvParser', () => {

    afterEach(() => {
        sandbox.reset();
    });


    describe('parse file with invalid format', () => {

        it('should reject when inconsistent columns', async () => {
            const csv = 'a,b,c\nd,e';
            return expect(parseCsv(bufferFrom(csv))).to.be.rejected();
        });

        it('should reject when no columns', async () => {
            const csv = 'a b c d e';
            return expect(parseCsv(bufferFrom(csv))).to.be.rejected();
        });

        it('should reject when too few columns', async () => {
            const csv = 'a,b';
            return expect(parseCsv(bufferFrom(csv))).to.be.rejected();
        });

        it('should reject when too many columns', async () => {
            const csv = 'a,b,c,d';
            return expect(parseCsv(bufferFrom(csv))).to.be.rejected();
        });

    });

    describe('parse file with valid format', () => {

        it('should call database for valid record with invalid values', async () => {
            const csv = 'a,b,';
            await parseCsv(bufferFrom(csv));
            expect(dbClient.stageCaseload).to.be.calledWith('', '', '', false);
        });

        it('should call database for valid record with valid values', async () => {
            const csv = 'nomis,pnc,staffid';
            await parseCsv(bufferFrom(csv));
            expect(dbClient.stageCaseload).to.be.calledWith('nomis', 'pnc', 'staffid', true);
        });

        it('should call database once per record', async () => {
            const csv = '1,1,1\n2,2,2\n3,3,3';
            await parseCsv(bufferFrom(csv));
            expect(dbClient.stageCaseload).to.be.calledThrice();
        });
    });

});
