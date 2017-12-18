const {
    sandbox,
    expect
} = require('../testSetup');

const loggerStub = {
    debug: sandbox.stub()
};

const createCsvParser = require('../../server/utils/csvParser');
const csvRowFormatter = require('../../server/utils/csvRowFormatter');

const columns = ['a', 'b', 'c'];

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
            const csv = 'a,b,c\n1,2,3\n1,2';
            return expect(parseCsv(bufferFrom(csv), columns, ',')).to.be.rejected();
        });

        it('should reject when no columns', async () => {
            const csv = 'a,b,c\n1 2 3';
            return expect(parseCsv(bufferFrom(csv), columns, ',')).to.be.rejected();
        });

        it('should reject when wrong delimiter specified', async () => {
            const csv = 'a,b,c\n1;2;3';
            return expect(parseCsv(bufferFrom(csv), columns, ',')).to.be.rejected();
        });

        it('should reject when too few columns', async () => {
            const csv = 'a,b,c\n1,2';
            return expect(parseCsv(bufferFrom(csv), columns, ',')).to.be.rejected();
        });

        it('should reject when too many columns', async () => {
            const csv = 'a,b,c\n1,2,3,4';
            return expect(parseCsv(bufferFrom(csv), columns, ',')).to.be.rejected();
        });

    });

    describe('parse file with valid format', () => {

        it('should call database for valid record with invalid values', async () => {
            const csv = 'a,b,c\n1,2,';
            await parseCsv(bufferFrom(csv), columns, ',');
            expect(dbClient.stageCaseload).to.be.calledWith('', '', '', false);
        });

        it('should call database for valid record with valid values', async () => {
            const csv = 'a,b,c\nnomis,pnc,staffid';
            await parseCsv(bufferFrom(csv), columns, ',');
            expect(dbClient.stageCaseload).to.be.calledWith('nomis', 'pnc', 'staffid', true);
        });

        it('should call database once per record', async () => {
            const csv = 'a,b,c\n1,1,1\n2,2,2\n3,3,3';
            await parseCsv(bufferFrom(csv), columns, ',');
            expect(dbClient.stageCaseload).to.be.calledThrice();
        });
    });

});
