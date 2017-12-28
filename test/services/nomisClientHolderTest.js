const {NomisClientHolder} = require('../../server/services/nomisClientHolder');
const {expect, sandbox} = require('../testSetup');

describe('nomisClientHolder', () => {

    const nomisClientBuilder = sandbox.stub().returnsPromise().resolves({});

    const signInService = {
        signIn: sandbox.stub().returnsPromise().resolves({token: 'token'})
    };

    const systemUserInfo = {
        name: 'name',
        pass: 'pass',
        roles: ['role']
    };

    let nomisClientHolder;

    beforeEach(() => {
        nomisClientHolder = new NomisClientHolder(nomisClientBuilder, signInService, systemUserInfo);
    });

    afterEach(() => {
        sandbox.reset();
    });

    it('should do nomis sign in on request', () => {
        nomisClientHolder.login();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should do nomis sign in when client acquired', () => {
        nomisClientHolder.get();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should not do nomis sign in when client already acquired', async () => {
        await nomisClientHolder.get();
        await nomisClientHolder.get();
        expect(signInService.signIn).to.be.calledOnce();
    });

    it('should error when sign in error', () => {
        signInService.signIn.rejects();
        return expect(nomisClientHolder.get()).to.eventually.be.rejectedWith(Error, 'Error logging in as user: name');
    });
});
