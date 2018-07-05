const {
    request,
    sandbox,
    expect,
    appSetup
} = require('../supertestSetup');

const createAuditRoute = require('../../server/routes/audit');
const auth = require('../mockAuthentication');
const authenticationMiddleware = auth.authenticationMiddleware;

const dbClientStub = {
    getAudit: sandbox.stub().returnsPromise().resolves({rows: []})
};

const loggerStub = {
    debug: sandbox.stub(),
    info: sandbox.stub(),
    warn: sandbox.stub(),
    error: sandbox.stub()
};

const testUser = {
    staffId: 'my-staff-id',
    token: 'my-token',
    roleCode: 'OM'
};

const app = appSetup(createAuditRoute({
    logger: loggerStub,
    dbClient: dbClientStub,
    authenticationMiddleware
}), testUser);

describe('GET /audit', () => {

    afterEach(() => {
        sandbox.reset();
    });

    it('should get data and re-display page', () => {
        return request(app)
            .get('/')
            .expect(200)
            .expect(res => {
                expect(dbClientStub.getAudit).to.be.calledOnce();
            });
    });

    it('should redirect to route if error', () => {

        dbClientStub.getAudit = sandbox.stub().returnsPromise().rejects();

        return request(app)
            .get('/')
            .expect(302)
            .expect(res => {
                expect(res.text).to.include('Redirecting to /?error=undefined');
            });
    });
});

