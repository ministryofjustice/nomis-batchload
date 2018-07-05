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
const createBatchloadService = require('../../server/services/batchloadService');

const dbClientStub = {
    bulkInsert: sandbox.stub().returnsPromise().resolves({}),
    clearStaged: sandbox.stub(),
    clearUpload: sandbox.stub(),
    copyNomisIdsFromMaster: sandbox.stub().returnsPromise().resolves(),
    getStagedPncs: sandbox.stub().returnsPromise().resolves({
        rows: [
            {offender_pnc: 'a'},
            {offender_pnc: 'b'}
        ]
    }),
    getPending: sandbox.stub().returnsPromise().resolves([]),
    fillNomisId: sandbox.stub().returnsPromise().resolves(),
    getUploadInvalidCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getUploadValidCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getUploadDuplicateCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getStagedIncompleteCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getStagedCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getPendingCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getRejectedCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    getSentCount: sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]}),
    mergeStageToMaster: sandbox.stub().returnsPromise().resolves(),
    updateWithNomisResult: sandbox.stub().returnsPromise().resolves()
};

const nomisClient = {
    getNomisIdForPnc: sandbox.stub().returnsPromise().resolves([{offenderNo: 'offenderId'}]),
    postComRelation: sandbox.stub().returnsPromise().resolves()
};

const nomisClientBuilder = sandbox.stub().returns(nomisClient);

const loggerStub = {
    debug: sandbox.stub(),
    info: sandbox.stub(),
    warn: sandbox.stub(),
    error: sandbox.stub()
};

const audit = {
    record: sandbox.stub()
};

const fakeSignInService = {
    signIn: sandbox.stub().returns({token: 'fake-system-token'})
};

const testUser = {
    staffId: 'my-staff-id',
    token: 'my-token',
    roleCode: 'OM'
};

const csvParser = csvParserBuilder(loggerStub, dbClientStub);
const batchloadService = createBatchloadService(nomisClientBuilder, dbClientStub, audit, fakeSignInService);

const app = appSetup(createUploadRoute({
    batchloadService,
    logger: loggerStub,
    dbClient: dbClientStub,
    audit,
    authenticationMiddleware,
    csvParser
}), testUser);

describe('upload routes', () => {
    describe('GET /upload', () => {

        afterEach(() => {
            sandbox.reset();
            dbClientStub.getStagedIncompleteCount = sandbox.stub().returnsPromise().resolves({rows: [{count: 3}]});
        });

        it('should get data and re-display page', () => {
            return request(app)
                .get('/')
                .expect(200)
                .expect(res => {
                    expect(dbClientStub.getStagedIncompleteCount).to.be.calledOnce();
                    expect(dbClientStub.getStagedCount).to.be.calledOnce();
                    expect(dbClientStub.getPendingCount).to.be.calledOnce();
                    expect(dbClientStub.getRejectedCount).to.be.calledOnce();
                });
        });

        it('should redirect to route if error', () => {

            dbClientStub.getStagedIncompleteCount = sandbox.stub().returnsPromise().rejects();

            return request(app)
                .get('/')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=undefined');
                });
        });
    });

    describe('POST /upload', () => {

        afterEach(() => {
            sandbox.reset();
        });

        it('should add valid data to staging db and redirect to results', () => {
            return request(app)
                .post('/')
                .attach('datafile', __dirname + '/resources/oneValidRow.csv')
                .expect(302)
                .expect(res => {
                    expect(dbClientStub.bulkInsert).to.be.calledOnce();
                    expect(res.text).to.include('Redirecting to /');
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
                .attach('datafile', __dirname + '/resources/invalid.txt')
                .expect(400);
        });

        it('should redirect to route if error', () => {
            dbClientStub.clearUpload = sandbox.stub().returnsPromise().rejects(new Error('clearUpload'));
            return request(app)
                .post('/')
                .attach('datafile', __dirname + '/resources/oneValidRow.csv')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=Error:%20clearUpload');
                });
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

        it('should redirect to route if error', () => {

            dbClientStub.clearStaged = sandbox.stub().returnsPromise().rejects();

            return request(app)
                .get('/clearStaged')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=undefined');
                });
        });
    });

    describe('GET /activityStatus', () => {

        afterEach(() => {
            sandbox.reset();
            dbClientStub.getStagedCount.resolves({rows: [{count: 3}]});
        });

        it('should return json object with data', () => {
            return request(app)
                .get('/activityStatus')
                .expect(200)
                .expect(res => {

                    const data = JSON.parse(res.text);

                    expect(data.uploadInvalid).to.eql(3);
                    expect(data.uploadValid).to.eql(3);
                    expect(data.uploadDuplicate).to.eql(3);
                    expect(data.stagedIncomplete).to.eql(3);
                    expect(data.staged).to.eql(3);
                    expect(data.pending).to.eql(3);
                    expect(data.rejected).to.eql(3);
                    expect(data.sent).to.eql(3);
                    expect(data.isFilling).to.eql(false);
                    expect(data.isSending).to.eql(false);
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

        it('should redirect to route', () => {
            return request(app)
                .get('/stopFill')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /');
                    expect(!batchloadService.isFilling());
                });
        });

    });

    describe('GET /stopSend', () => {

        afterEach(() => {
            sandbox.reset();
        });

        it('should redirect to route', () => {
            return request(app)
                .get('/stopSend')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /');
                    expect(!batchloadService.isSending());
                });
        });
    });

    describe('GET /merge', () => {

        afterEach(() => {
            sandbox.reset();
        });

        it('should redirect to route and call mergeStageToMaster', () => {
            return request(app)
                .get('/merge')
                .expect(302)
                .expect(res => {
                    expect(dbClientStub.mergeStageToMaster).to.be.calledOnce();
                    expect(res.text).to.include('Redirecting to /');
                });
        });

        it('should redirect to route if error', () => {

            dbClientStub.mergeStageToMaster = sandbox.stub().returnsPromise().rejects();

            return request(app)
                .get('/merge')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=undefined');
                });
        });
    });

    describe('GET /viewIncomplete', () => {

        afterEach(() => {
            sandbox.reset();
        });

        it('should redirect to route', () => {

            dbClientStub.getStagedIncomplete = sandbox.stub().returnsPromise().resolves({
                rows: [
                    {
                        id: 1, timestamp: '2017-12-21 0:0:0.0',
                        offender_nomis: 2, offender_pnc: 3,
                        staff_id: 4, staff_first: 5, staff_last: 6,
                        rejection: 7
                    }
                ]
            });

            return request(app)
                .get('/viewIncomplete')
                .expect(200)
                .expect(res => {
                    expect(res.text).to.include('<td>1</td>' +
                        '<td>21/12/2017 - 00:00</td>' +
                        '<td>2</td>' +
                        '<td>3</td>' +
                        '<td>4</td>' +
                        '<td>5</td>' +
                        '<td>6</td>' +
                        '<td>7</td>');
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

        it('should redirect to route', () => {

            dbClientStub.getRejected = sandbox.stub().returnsPromise().resolves({
                rows: [
                    {
                        id: 1, timestamp: '2017-12-21 0:0:0.0',
                        offender_nomis: 2, offender_pnc: 3,
                        staff_id: 4, staff_first: 5, staff_last: 6,
                        rejection: 7
                    }
                ]
            });

            return request(app)
                .get('/viewErrors')
                .expect(200)
                .expect(res => {
                    expect(res.text).to.include('<td>1</td>' +
                        '<td>21/12/2017 - 00:00</td>' +
                        '<td>2</td>' +
                        '<td>3</td>' +
                        '<td>4</td>' +
                        '<td>5</td>' +
                        '<td>6</td>' +
                        '<td>7</td>');
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

        beforeEach(() => {
            dbClientStub.copyNomisIdsFromMaster.resolves();
            dbClientStub.getStagedPncs.resolves({
                rows: [
                    {offender_pnc: 'a'},
                    {offender_pnc: 'b'}
                ]
            });
            nomisClient.getNomisIdForPnc.resolves([{offenderNo: 'offenderId'}]);
        });

        afterEach(() => {
            sandbox.reset();
            batchloadService.stopFilling();
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

    describe('GET /send', () => {

        beforeEach(() => {
            dbClientStub.getPending.resolves({
                rows: [
                    {
                        id: 1, timestamp: '2017-12-21 0:0:0.0',
                        offender_nomis: 2, offender_pnc: 3,
                        staff_id: 4, staff_first: 5, staff_last: 6,
                        rejection: 7
                    }, {
                        id: 21, timestamp: '2017-12-21 0:0:0.0',
                        offender_nomis: 22, offender_pnc: 23,
                        staff_id: 24, staff_first: 25, staff_last: 26,
                        rejection: 27
                    }
                ]
            });
        });

        afterEach(() => {
            sandbox.reset();
            batchloadService.stopSending();
        });

        it('should start the queue for posting relationships to nomis', () => {
            return request(app)
                .get('/send')
                .expect(302)
                .expect(res => {
                    expect(dbClientStub.getPending).to.be.calledOnce();
                    expect(dbClientStub.updateWithNomisResult).to.be.calledOnce();
                });
        });

        it('should handle error getting pending records', () => {
            dbClientStub.getPending.rejects(new Error('pending'));
            return request(app)
                .get('/send')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=Error:%20pending');
                });
        });

        it('should continue on api error', () => {
            nomisClient.postComRelation.rejects(new Error('api error'));
            return request(app)
                .get('/send')
                .expect(302)
                .expect(res => {
                    expect(dbClientStub.updateWithNomisResult).to.be.calledOnce();
                    expect(res.text).to.include('Redirecting to /');
                });
        });

        it('should redirect to route if error', () => {

            dbClientStub.getPending.rejects(new Error('getpending'));

            return request(app)
                .get('/send')
                .expect(302)
                .expect(res => {
                    expect(res.text).to.include('Redirecting to /?error=Error:%20getpending');
                });
        });
    });
});
