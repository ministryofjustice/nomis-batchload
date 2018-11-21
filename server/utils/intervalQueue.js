const logger = require('../../log');

module.exports = {IntervalQueue};

function IntervalQueue(method, interval, finishedCallback) {
    let timer; // eslint-disable-line no-unused-vars
    this.method = method;
    this.interval = interval;
    this.finishedCallback = finishedCallback;

    this.run = function(username, list) {

        const [head, ...tail] = list;

        try {
            logger.info('Calling queue method');
            this.method(username, head);
        } catch (err) {
            logger.error(err);
        }

        if(tail.length === 0) {
            logger.info('Finished queue');
            this.finishedCallback();
            return;
        }
        this.timer = setTimeout(() => this.run(username, tail), this.interval);
    };
}

IntervalQueue.prototype.start = function(username, list) {
    if(!list || list.length === 0) {
        this.finishedCallback();
        return;
    }
    this.run(username, list);
};

IntervalQueue.prototype.stop = function() {
    clearTimeout(this.timer);
};
