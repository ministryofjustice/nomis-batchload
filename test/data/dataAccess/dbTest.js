const {
    sandbox,
    expect
} = require('../../supertestSetup');

const db = require('../../../server/data/dataAccess/db');

describe('db', () => {

    const connectionStub = {
        close: sandbox.stub()
    };

    const requestStub = {
        addParameter: sandbox.stub()
    };

    afterEach(() => {
        sandbox.reset();
    });

    it.skip('should fail on connection error', async () => {

        // how to cause db connection to fail

        let connection = db.connect();
    });

    it('should close connection on disconnect', async () => {
        db.disconnect(connectionStub);
        expect(connectionStub.close).to.be.calledOnce();
    });

    it('should add each parameter to the request', async () => {
        db.addParams([1, 2, 3], requestStub);
        expect(requestStub.addParameter).to.be.calledThrice();
    });
});
