const {NomisWrapper} = require('../../server/services/nomisWrapper');
const {expect, sandbox} = require('../testSetup');

describe('nomisWrapper', () => {

    const clientStub = {
        getNomisIdForPnc: sandbox.stub().returnsPromise().resolves(1111),
        postComRelation: sandbox.stub().returnsPromise().resolves(2)
    };

    const nomisClientBuilder = sandbox.stub().returnsPromise().resolves(clientStub);

    const signInService = {
        signIn: sandbox.stub().returnsPromise().resolves({token: 'token'})
    };

    const authErrorStub = {
        status: 401
    };

    const systemUserInfo = {
        name: 'name',
        pass: 'pass',
        roles: ['role']
    };

    let nomisWrapper;

    beforeEach(() => {
        nomisWrapper = new NomisWrapper(nomisClientBuilder, signInService, systemUserInfo);
    });

    afterEach(() => {
        sandbox.reset();
    });

    it('should do nomis sign in on request', async () => {
        nomisWrapper.login();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should do nomis sign in when client acquired', async () => {
        nomisWrapper.getClient();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should not do nomis sign in when client already acquired', async () => {
        await nomisWrapper.getClient();
        await nomisWrapper.getClient();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should login on first use and delegate calls to nomis client', async () => {
        await nomisWrapper.getNomisIdForPnc(1);
        await nomisWrapper.postComRelation(1, 2, 3, 4);
        expect(signInService.signIn).to.be.calledOnce();
        expect(clientStub.getNomisIdForPnc).to.be.calledOnce();
        expect(clientStub.postComRelation).to.be.calledOnce();
    });

    it('should retry once then error when auth error - getNomisIdForPnc', async () => {
        try {
            clientStub.getNomisIdForPnc.throws(authErrorStub);
            await nomisWrapper.getNomisIdForPnc();
        } catch (error) {
            expect(signInService.signIn).to.be.calledTwice();
            expect(clientStub.getNomisIdForPnc).to.be.calledTwice();
        }
    });

    it('should retry once then error when auth error - postComRelation', async () => {
        try {
            clientStub.postComRelation.throws(authErrorStub);
            await nomisWrapper.postComRelation();
        } catch (error) {
            expect(signInService.signIn).to.be.calledTwice();
            expect(clientStub.postComRelation).to.be.calledTwice();
        }
    });

    it('should error when sign in error', async () => {
        signInService.signIn.rejects();
        return expect(nomisWrapper.getClient()).to.eventually.be.rejectedWith(Error, 'Error logging in as user: name');
    });
});
