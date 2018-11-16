const createBatchloadService = require('../../server/services/batchloadService');
const {expect, sandbox} = require('../testSetup');

describe('batchloadService', () => {
    let dbClient;
    let nomisClient;
    let service;

    beforeEach(() => {
        dbClient = {
            copyNomisIdsFromMaster: sandbox.stub().returnsPromise().resolves(),
            getStagedIncomplete: sandbox.stub().returnsPromise().resolves({rows:
                [{id: 1, offender_pnc: '123'}]}),
            getStagedPncs: sandbox.stub().returnsPromise().resolves({rows: [
                {offender_pnc: '123'},
                {offender_pnc: '456'}
            ]}),
            fillNomisId: sandbox.stub().returnsPromise().resolves(),
            findNomisId: sandbox.stub().returnsPromise().resolves({rows: [{offender_nomis: 'abc'}]}),
            getPending: sandbox.stub().returnsPromise().resolves({rows: [{
                id: 1, timestamp: '2017-12-21 0:0:0.0',
                offender_nomis: 2, offender_pnc: 3,
                staff_id: 4, staff_first: 5, staff_last: 6
            }, {
                    id: 21, timestamp: '2017-12-21 0:0:0.0',
                    offender_nomis: 22, offender_pnc: 23,
                    staff_id: 24, staff_first: 25, staff_last: 26
            }]}),
            markFillRejected: sandbox.stub().returnsPromise().resolves(),
            markProcessed: sandbox.stub().returnsPromise().resolves(),
            updateWithNomisResult: sandbox.stub().returnsPromise().resolves()
        }
        ;

        nomisClient = {
            getNomisIdForPnc: sandbox.stub().returnsPromise().resolves([{offenderNo: 'id-from-nomis'}]),
            postComRelation: sandbox.stub().returnsPromise().resolves()
        };

        const nomisClientBuilder = sandbox.stub().returns(nomisClient);

        const audit = {
            record: sandbox.stub()
        };

        const fakeSignInService = {
            signIn: sandbox.stub().returns({token: 'fake-system-token'})
        };

        service = createBatchloadService(nomisClientBuilder, dbClient, audit, fakeSignInService);
    });

    afterEach(() => {
        sandbox.reset();
    });

    describe('fill', () => {

        // it('should copy IDs from master', async () => {
        //     await service.fill();
        //     expect(dbClient.copyNomisIdsFromMaster).to.be.calledOnce();
        // });

        it('should try to fill staged PNCs', async () => {
            await service.fill();
            expect(dbClient.getStagedPncs).to.be.calledOnce();
        });

        it('should ask nomis for an id if it cant find one', async () => {
            await service.fill('username');
            expect(nomisClient.getNomisIdForPnc).to.be.calledOnce();
            expect(nomisClient.getNomisIdForPnc).to.be.calledWith('123');
        });

        it('should send found id to db', async () => {
            await service.fill();
            expect(dbClient.fillNomisId).to.be.calledOnce();
            expect(dbClient.fillNomisId).to.be.calledWith('123', 'id-from-nomis');
        });

        it('should send found id and error message to db when API error', async () => {
            nomisClient.getNomisIdForPnc.rejects(new Error('error-from-nomis'));
            await service.fill();
            expect(dbClient.fillNomisId).to.be.calledOnce();
            expect(dbClient.fillNomisId).to.be.calledWith('123', null, '0: "error-from-nomis"');
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
            expect(nomisClient.postComRelation).to.be.calledWith(2, 4);
        });

        it('should send error message to db when API error', async () => {
            nomisClient.postComRelation.rejects(new Error('error-from-nomis'));
            await service.send();
            expect(dbClient.updateWithNomisResult).to.be.calledOnce();
            expect(dbClient.updateWithNomisResult).to.be.calledWith(1, '0: "error-from-nomis"');
        });
    });

    describe('stop/start', () => {

        it('should switch filling status with start stop', async () => {
            expect(service.isFilling()).to.be.false();
            service.fill();
            expect(service.isFilling()).to.be.true();
            service.stopFilling();
            expect(service.isFilling()).to.be.false();
        });

        it('should switch sending status with start stop', async () => {
            expect(service.isSending()).to.be.false();
            service.send();
            expect(service.isSending()).to.be.true();
            service.stopSending();
            expect(service.isSending()).to.be.false();
        });

        it('should switch filling state with completion callback', async () => {
            expect(service.isFilling()).to.be.false();
            service.fill();
            expect(service.isFilling()).to.be.true();
            service.fillingFinished();
            expect(service.isFilling()).to.be.false();
        });

        it('should switch sending status with completion callback', async () => {
            expect(service.isSending()).to.be.false();
            service.send();
            expect(service.isSending()).to.be.true();
            service.sendingFinished();
            expect(service.isSending()).to.be.false();
        });
    });
});
