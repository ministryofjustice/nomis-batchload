const createBatchloadService = require('../../server/services/batchloadService');
const {expect, sandbox} = require('../testSetup');

describe('batchloadService', () => {
    let dbClient, nomisClient, nomisClientBuilder, service;

    beforeEach(() => {
        dbClient = {
            getStagedIncomplete: sandbox.stub().returnsPromise().resolves(
                [{ID: {value: 1}, OFFENDER_PNC: {value: '123'}}]),
            fillNomisId: sandbox.stub().returnsPromise().resolves(),
            findNomisId: sandbox.stub().returnsPromise().resolves([{OFFENDER_NOMIS: {value: 'abc'}}]),
            getPending: sandbox.stub().returnsPromise().resolves(
                [{OFFENDER_NOMIS: {value: 'abc'}, STAFF_ID: {value: 'staffid'}, ID: {value: 'recordId'}}]
            ),
            markRejected: sandbox.stub().returnsPromise().resolves(),
            markProcessed: sandbox.stub().returnsPromise().resolves()
        };

        nomisClient = {
            getNomisIdForPnc: sandbox.stub().returnsPromise().resolves({}),
            postComRelation: sandbox.stub().returnsPromise().resolves()
        };

        nomisClientBuilder = sandbox.stub().returns(nomisClient);
        service = createBatchloadService(nomisClientBuilder, dbClient);
    });

    afterEach(() => {
        sandbox.reset();
    });

    describe('fill', () => {
        it('should fill the nomis id if it finds them locally', async() => {
           await service.fill();

           expect(dbClient.fillNomisId).to.be.calledOnce();
           expect(dbClient.fillNomisId).to.be.calledWith(1, 'abc');
        });

        it('should fill multiple nomis ids if it finds them locally', async() => {
            const multipleIncomplete = [
                {ID: {value: 1}, OFFENDER_PNC: {value: 'pnc1'}},
                {ID: {value: 2}, OFFENDER_PNC: {value: 'pnc2'}},
                {ID: {value: 3}, OFFENDER_PNC: {value: 'pnc3'}},
                {ID: {value: 4}, OFFENDER_PNC: {value: 'pnc4'}},
                {ID: {value: 5}, OFFENDER_PNC: {value: 'pnc5'}}
            ];
            dbClient.getStagedIncomplete.resolves(multipleIncomplete);
            await service.fill();

            expect(dbClient.fillNomisId).to.have.callCount(5);
        });

        it('should ask nomis for an id if it cant find one', async() => {
            dbClient.findNomisId.resolves([{OFFENDER_NOMIS: {value: ''}}]);
            await service.fill();

            expect(dbClient.fillNomisId).to.not.be.called();
            expect(nomisClient.getNomisIdForPnc).to.be.calledOnce();
            expect(nomisClient.getNomisIdForPnc).to.be.calledWith('123');
        });

        it('should fill the rest if any error', async() => {
            const multipleWithError = [
                {ID: {value: 1}, OFFENDER_PNC: {value: 'pnc1'}},
                {ID: {value: 2}, OFFENDER_PNC: {value: 'pnc2'}},
                {ID: {value: 3}, OFFENDER_PNC: {value: 'pnc3'}},
                {ID: {value: 4}, OFFENDER_PNC: {value: 'pnc4'}},
                {ID: {value: 5}, OFFENDER_PNC: {value: 'pnc5'}}
            ];

            dbClient.getStagedIncomplete.resolves(multipleWithError);
            dbClient.findNomisId.onThirdCall().throws();
            await service.fill();

            expect(dbClient.fillNomisId).to.have.callCount(4);
            expect(dbClient.fillNomisId).to.be.calledWith(5, 'abc');
        });
    });

    describe('send', () => {
        it('should do nothing if no pending results', async () => {
           dbClient.getPending.resolves([]);
           await service.send();

           expect(nomisClient.postComRelation).to.not.be.called();
        });

        it('should update nomis with pending results', async () => {
            await service.send();

            expect(nomisClient.postComRelation).to.be.calledOnce();
            expect(nomisClient.postComRelation).to.be.calledWith('abc', 'staffid');
        });

        it('should update nomis with multiple results', async () => {
            dbClient.getPending.resolves([
                {OFFENDER_NOMIS: {value: 'nomisId'}, STAFF_ID: {value: 'staffId'}, ID: {value: 'recordId'}},
                {OFFENDER_NOMIS: {value: 'nomisId1'}, STAFF_ID: {value: 'staffid2'}, ID: {value: 'recordId2'}},
                {OFFENDER_NOMIS: {value: 'nomisId2'}, STAFF_ID: {value: 'staffid3'}, ID: {value: 'recordId3'}}
            ]);

            await service.send();

            expect(nomisClient.postComRelation).to.be.calledThrice();
        });

        it('should mark successful posts with processed', async () => {
            await service.send();

            expect(dbClient.markProcessed).to.be.calledOnce();
            expect(dbClient.markProcessed).to.be.calledWith('recordId');
            expect(dbClient.markRejected).to.not.be.called();
        });

        it('should mark unsuccessful posts with rejected', async () => {
            nomisClient.postComRelation.rejects();
            await service.send();

            expect(dbClient.markRejected).to.be.calledOnce();
            expect(dbClient.markRejected).to.be.calledWith('recordId');
            expect(dbClient.markProcessed).to.not.be.called();
        });

        it('should only mark unsuccessful posts with processed', async () => {
            dbClient.getPending.resolves([
                {OFFENDER_NOMIS: {value: 'nomisId'}, STAFF_ID: {value: 'staffId'}, ID: {value: 'recordId'}},
                {OFFENDER_NOMIS: {value: 'nomisId1'}, STAFF_ID: {value: 'staffid2'}, ID: {value: 'recordId2'}},
                {OFFENDER_NOMIS: {value: 'nomisId2'}, STAFF_ID: {value: 'staffid3'}, ID: {value: 'recordId3'}}
            ]);
            nomisClient.postComRelation.onSecondCall().throws();
            await service.send();

            expect(dbClient.markProcessed).to.be.calledTwice();
            expect(dbClient.markProcessed).to.be.calledWith('recordId');
            expect(dbClient.markProcessed).to.be.calledWith('recordId3');
            expect(dbClient.markRejected).to.be.calledOnce();
            expect(dbClient.markRejected).to.be.calledWith('recordId2');
        });
    });
});
