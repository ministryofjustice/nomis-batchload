const proxyquire = require('proxyquire');
proxyquire.noCallThru();

const {
    expect,
    sandbox
} = require('../testSetup');


describe('Audit', () => {

    const queryStub = sandbox.stub().returnsPromise().resolves();

    const record = (query = queryStub) => {
        return proxyquire('../../server/data/audit', {
            './dataAccess/db': {
                query
            }
        }).record;
    };

    afterEach(() => {
        sandbox.reset();
    });

    it('should reject if unspecified key', () => {
        expect(() => record()('Key', 'a@y.com', {data: 'data'})).to.throw(Error);
    });

    it('should call db.query', () => {
        const result = record()('CLEAR_UPLOAD', 'a@y.com', {data: 'data'});

        return result.then(data => {
            expect(queryStub).to.have.callCount(1);
        });
    });

    it('should pass the sql paramaters', () => {
        const result = record()('CLEAR_UPLOAD', 'a@y.com', {data: 'data'});
        const expectedParameters = ['a@y.com', 'CLEAR_UPLOAD', {data: 'data'}];

        return result.then(data => {
            expect(queryStub.getCall(0).args[0].values).to.eql(expectedParameters);
        });
    });
});
