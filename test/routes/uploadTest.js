const {
    request,
    sandbox,
    expect,
    appSetup
} = require('../supertestSetup');

const createUploadRoute = require('../../server/routes/upload');
const auth = require('../mockAuthentication');
const authenticationMiddleware = auth.authenticationMiddleware;

const loggerStub = {
    debug: sandbox.stub()
};
const serviceStub = {
    doThings: sandbox.stub().returnsPromise()
};

const audit = {
    record: sandbox.stub()
};

const testUser = {
    staffId: 'my-staff-id',
    token: 'my-token',
    roleCode: 'OM'
};

const app = appSetup(createUploadRoute(
    {batchloadService: serviceStub, logger: loggerStub, audit, authenticationMiddleware}), testUser);

describe('GET /', () => {

    beforeEach(() => {
        serviceStub.doThings.resolves({});
    });

    afterEach(() => {
        sandbox.reset();
    });

    it.skip('should call doThings from batchloadService', () => {
        return request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /html/)
            .expect(res => {
                expect(serviceStub.doThings).to.be.calledOnce();
                expect(serviceStub.doThings).to.be.calledWith(testUser);
            });
    });
});

