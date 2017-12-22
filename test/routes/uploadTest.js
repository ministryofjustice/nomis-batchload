const {
    request,
    sandbox,
    expect,
    appSetup
} = require('../supertestSetup');

const createUploadRoute = require('../../server/routes/upload');
const auth = require('../mockAuthentication');
const authenticationMiddleware = auth.authenticationMiddleware;
const csvParserBuilder = require('../../server/utils/csvParser');
const batchloadServiceBuilder = require('../../server/services/batchloadService');


const execBulkLoad = sandbox.stub();
const addBulkloadRow = sandbox.stub().returns(1);

const dbClientStub = {
    getStageBulkload: sandbox.stub().returnsPromise().resolves({
        connection: {execBulkLoad},
        bulkload: {addRow: addBulkloadRow}
    }),
    clearStaged: sandbox.stub(),
    copyNomisIdsFromMaster: sandbox.stub().returnsPromise().resolves(),
    getStagedPncs: sandbox.stub().returnsPromise().resolves([
        {OFFENDER_PNC: {value: 'a'}},
        {OFFENDER_PNC: {value: 'b'}}
    ]),
    fillNomisId: sandbox.stub().returnsPromise().resolves(),
    getStagedIncompleteCount: sandbox.stub().returnsPromise().resolves([{COUNT: {value: 3}}]),
    getStagedCount: sandbox.stub().returnsPromise().resolves([{COUNT: {value: 3}}]),
    getPendingCount: sandbox.stub().returnsPromise().resolves([{COUNT: {value: 3}}]),
    getRejectedCount: sandbox.stub().returnsPromise().resolves([{COUNT: {value: 3}}]),
    mergeStageToMaster: sandbox.stub().returnsPromise().resolves()
};

const nomisClient = {
    getNomisIdForPnc: sandbox.stub().returnsPromise().resolves([{offenderId: 'offenderId'}])
};

const nomisClientBuilder = sandbox.stub().returns(nomisClient);

const loggerStub = {
    debug: sandbox.stub(),
    info: sandbox.stub()
};

const audit = {
    record: sandbox.stub()
};

const testUser = {
    staffId: 'my-staff-id',
    token: 'my-token',
    roleCode: 'OM'
};

const csvParser = csvParserBuilder(loggerStub, dbClientStub);
const batchloadService = batchloadServiceBuilder(nomisClientBuilder, dbClientStub);

const app = appSetup(createUploadRoute({
    batchloadService,
    logger: loggerStub,
    dbClient: dbClientStub,
    audit,
    authenticationMiddleware,
    csvParser}), testUser);

describe('POST /upload', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should add valid data to staging db and redirect to results', () => {
        return request(app)
            .post('/')
            .attach('datafile', __dirname + '/testCsvs/oneValidRow.csv')
            .expect(302)
            .expect(res => {
                expect(execBulkLoad).to.be.calledOnce();
                expect(addBulkloadRow).to.be.calledOnce();
                expect(res.text).to.include('Redirecting to /?result');
            });
    });

    it('should throw an error if no file uploaded', () => {
        return request(app)
            .post('/')
            .expect(400);

    });

    it('should throw an error if non csv uploaded', () => {
        return request(app)
            .post('/')
            .attach('datafile', __dirname + '/testCsvs/invalid.xls')
            .expect(400);

    });
});

describe('GET /clearStaged', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should empty the stage data', () => {
        return request(app)
            .get('/clearStaged')
            .expect(302)
            .expect(res => {
                expect(dbClientStub.clearStaged).to.be.calledOnce();
            });
    });
});

describe('GET /activityStatus', () => {

    afterEach(() => {
        sandbox.reset();
        dbClientStub.getStagedCount.resolves([{COUNT: {value: 3}}]);
    });

    it('should return json object with data', () => {
        return request(app)
            .get('/activityStatus')
            .expect(200)
            .expect(res => {
                expect(res.text).to.eql('{"stagedIncomplete":3,' +
                    '"staged":3,' +
                    '"pending":3,' +
                    '"rejected":3,' +
                    '"isFilling":false,' +
                    '"isSending":false}');
            });
    });

    it('should return 500 if fails', () => {
        const error = new Error('error');
        dbClientStub.getStagedCount.rejects(error);
        return request(app)
            .get('/activityStatus')
            .expect(500)
            .expect(res => {
                expect(res.text).to.contain(JSON.stringify(error));
            });
    });

});

describe('GET /stopFill', () => {

    afterEach(() => {
        sandbox.reset();
    });

    // can't think how to test this is happening!

    it('should redirect to route', () => {
        return request(app)
            .get('/stopFill')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /');
            });
    });
});

describe('GET /stopSend', () => {

    afterEach(() => {
        sandbox.reset();
    });

    // can't think how to test this is happening!

    it('should redirect to route', () => {
        return request(app)
            .get('/stopSend')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /');
            });
    });
});

describe('GET /merge', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should redirect to route adn call mergeStageToMaster', () => {
        return request(app)
            .get('/merge')
            .expect(302)
            .expect(res => {
                expect(dbClientStub.mergeStageToMaster).to.be.calledOnce();
                expect(res.text).to.include('Redirecting to /');
            });
    });
});

describe('GET /viewIncomplete', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should redirect to route adn call mergeStageToMaster', () => {

        dbClientStub.getStagedIncomplete = sandbox.stub().returnsPromise().resolves([
            {ID: {value: 1}, TIMESTAMP: {value: '2017-12-21 0:0:0.0'}, OFFENDER_NOMIS: {value: 2},
                OFFENDER_PNC: {value: 3}, STAFF_ID: {value: 4}, REJECTION: {value: 5}}
        ]);

        return request(app)
            .get('/viewIncomplete')
            .expect(200)
            .expect(res => {
                expect(res.text).to.include('<td>1</td>' +
                    '<td>2017-12-21 0:0:0.0</td>' +
                    '<td>2</td>' +
                    '<td>3</td>' +
                    '<td>4</td>' +
                    '<td>5</td>');
            });
    });

    it('should redirect to route if error', () => {

        dbClientStub.getStagedIncomplete = sandbox.stub().returnsPromise().rejects();

        return request(app)
            .get('/viewIncomplete')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /?error=undefined');
            });
    });
});

describe('GET /viewErrors', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should redirect to route adn call mergeStageToMaster', () => {

        dbClientStub.getRejected = sandbox.stub().returnsPromise().resolves([
            {ID: {value: 1}, TIMESTAMP: {value: '2017-12-21 0:0:0.0'}, OFFENDER_NOMIS: {value: 2},
                OFFENDER_PNC: {value: 3}, STAFF_ID: {value: 4}, REJECTION: {value: 5}}
        ]);

        return request(app)
            .get('/viewErrors')
            .expect(200)
            .expect(res => {
                expect(res.text).to.include('<td>1</td>' +
                    '<td>2017-12-21 0:0:0.0</td>' +
                    '<td>2</td>' +
                    '<td>3</td>' +
                    '<td>4</td>' +
                    '<td>5</td>');
            });
    });

    it('should redirect to route if error', () => {

        dbClientStub.getRejected = sandbox.stub().returnsPromise().rejects();

        return request(app)
            .get('/viewErrors')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /?error=undefined');
            });
    });
});

describe('GET /fill', () => {

    afterEach(() => {
        sandbox.reset();
        dbClientStub.copyNomisIdsFromMaster.resolves();
        dbClientStub.getStagedPncs.resolves([
            {OFFENDER_PNC: {value: 'a'}},
            {OFFENDER_PNC: {value: 'b'}}
        ]);
        nomisClient.getNomisIdForPnc.resolves([{offenderId: 'offenderId'}]);
    });

    it('should start the queue for collecting and filling nomis ids', () => {
        return request(app)
            .get('/fill')
            .expect(302)
            .expect(res => {

                expect(dbClientStub.copyNomisIdsFromMaster).to.be.calledOnce();
                expect(dbClientStub.getStagedPncs).to.be.calledOnce();

                expect(dbClientStub.fillNomisId).to.be.calledOnce();
                expect(dbClientStub.fillNomisId).to.be.calledWith('a', 'offenderId', null);

            });
    });

    it('should handle error copying from master', () => {
        dbClientStub.copyNomisIdsFromMaster.rejects(new Error('nomisfrommaster'));
        return request(app)
            .get('/fill')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /?error=Error:%20nomisfrommaster');
            });
    });

    it('should handle error getting staged pncs', () => {
        dbClientStub.getStagedPncs.rejects(new Error('stagedpncs'));
        return request(app)
            .get('/fill')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /?error=Error:%20stagedpncs');
            });
    });

    it('should continue on api error', () => {
        nomisClient.getNomisIdForPnc.rejects(new Error('api error'));
        return request(app)
            .get('/fill')
            .expect(302)
            .expect(res => {
                expect(dbClientStub.fillNomisId).to.be.calledOnce();
                expect(res.text).to.include('Redirecting to /');
            });
    });
});
