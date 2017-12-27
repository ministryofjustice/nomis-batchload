const {
    sandbox,
    expect
} = require('../supertestSetup');

const auth = require('../../server/authentication/auth');
const authenticationMiddleware = auth.authenticationMiddleware();

describe('authenticationMiddleware', () => {

    const resMock = {
        redirect: sandbox.stub()
    };

    const nextMock = sandbox.stub().returns('callnext');

    afterEach(() => {
        sandbox.reset();
    });

    it('should invoke next authenticated', async () => {

        const reqMock = {
            isAuthenticated: sandbox.stub().returns(true)
        };

        const res = await authenticationMiddleware(reqMock, resMock, nextMock);
        expect(res).to.equal('callnext');
    });

    it('should redirect to /login if not authenticated', async () => {

        const reqMock = {
            isAuthenticated: sandbox.stub().returns(false)
        };

        authenticationMiddleware(reqMock, resMock, nextMock);
        expect(resMock.redirect).to.be.calledWith('/login');
    });


});
