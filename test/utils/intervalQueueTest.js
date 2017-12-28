const {IntervalQueue} = require('../../server/utils/intervalQueue');
const {expect, sandbox} = require('../testSetup');

describe('intervalQueue', () => {

    const methodStub = sandbox.stub();
    const finishedCallback = sandbox.stub();
    let intervalQueue = new IntervalQueue(methodStub, 2000, finishedCallback);
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
        intervalQueue.start(list);
        clock.tick(10000);
        expect(methodStub).to.be.calledThrice();
    });

    it('should call the method on passed in interval', () => {
        const list = ['a', 'b', 'c'];
        intervalQueue.start(list);

        expect(methodStub).to.be.calledOnce();

        clock.tick(2000);
        expect(methodStub).to.be.calledTwice();

        clock.tick(2000);
        expect(methodStub).to.be.calledThrice();
    });

    it('should not call method with empty list', () => {
        const list = [];
        intervalQueue.start(list);

        expect(methodStub).to.not.be.called();
    });

    it('should not call method with missing list', () => {
        const list = null;
        intervalQueue.start(list);

        expect(methodStub).to.not.be.called();
    });

    it('should call finishedCallback even with empty list', () => {
        const list = [];
        intervalQueue.start(list);

        expect(finishedCallback).to.be.calledOnce();
    });

    it('should call finishedCallback when ist becomes empty', () => {
        const list = ['a'];
        intervalQueue.start(list);

        expect(methodStub).to.be.calledOnce();
        expect(finishedCallback).to.be.calledOnce();
    });

    it('should not continue after array used up', () => {
        const list = ['a', 'b', 'c'];
        intervalQueue.start(list);
        clock.tick(10000);

        expect(methodStub).to.be.calledThrice();
    });

    it('should not continue after array used up', () => {
        const list = ['a', 'b', 'c'];
        intervalQueue.start(list);
        clock.tick(10000);

        expect(finishedCallback).to.be.calledOnce();
    });

    it('should stop when the stop function is called', () => {
        const list = ['a', 'b', 'c'];
        intervalQueue.start(list);
        clock.tick(2000);

        expect(methodStub).to.be.calledTwice();

        intervalQueue.stop();
        clock.tick(20000);

        expect(methodStub).to.be.calledTwice();
    });

    it('should carry on after target method causes error', () => {

        methodStub.throws(new Error('getpending'));

        const list = ['a', 'b', 'c'];
        intervalQueue.start(list);
        clock.tick(10000);

        expect(methodStub).to.be.calledThrice();
    });
});
