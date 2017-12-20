const {start, stop} = require('../../server/utils/intervalQueue');
const {expect, sandbox} = require('../testSetup');

describe('intervalQueue', () => {

    const methodStub = sandbox.stub();
    const finishedCallback = sandbox.stub();

    let clock;

    beforeEach(() => {
       clock = sandbox.useFakeTimers();
    });

    afterEach(() => {
        sandbox.reset();
        clock.restore();
    });

    it('should take a list and perform passed in method on each', () => {
        const list = ['a', 'b', 'c'];
        start(list, methodStub, 1, finishedCallback);
        clock.tick(1000);
        expect(methodStub).to.be.calledThrice();
    });

    it('should call the method on passed in interval', () => {
        const list = ['a', 'b', 'c'];
        start(list, methodStub, 2000, finishedCallback);

        expect(methodStub).to.be.calledOnce();

        clock.tick(2000);
        expect(methodStub).to.be.calledTwice();

        clock.tick(2000);
        expect(methodStub).to.be.calledThrice();
    });

    it('should not call method with empty list', () => {
        const list = [];
        start(list, methodStub, 2000, finishedCallback);

        expect(methodStub).to.not.be.called();
    });

    it('should not call finishedCallback with empty list', () => {
        const list = [];
        start(list, methodStub, 2000, finishedCallback);

        expect(finishedCallback).to.be.calledOnce();
    });

    it('should not continue after array used up', () => {
        const list = ['a', 'b', 'c'];
        start(list, methodStub, 2000, finishedCallback);
        clock.tick(10000);

        expect(methodStub).to.be.calledThrice();
    });

    it('should not continue after array used up', () => {
        const list = ['a', 'b', 'c'];
        start(list, methodStub, 2000, finishedCallback);
        clock.tick(10000);

        expect(finishedCallback).to.be.calledOnce();
    });

    it('should stop when the stop function is called', () => {
        const list = ['a', 'b', 'c'];
        start(list, methodStub, 2000, finishedCallback);
        clock.tick(2000);

        expect(methodStub).to.be.calledTwice();

        stop();
        clock.tick(20000);

        expect(methodStub).to.be.calledTwice();
    });

});
