module.exports = {IntervalQueue};

function IntervalQueue(method, interval, finishedCallback) {
    let timer;
    this.method = method;
    this.interval = interval;
    this.finishedCallback = finishedCallback;

    this.run = function(list, ) {
        const [head, ...tail] = list;

        try {
            this.method(head);
        } catch (err) {
            // do something
            console.error(err);
        }

        if(tail.length === 0) {
            this.finishedCallback();
            return;
        }
        this.timer = setTimeout(() => this.run(tail), this.interval);
    };
}

IntervalQueue.prototype.start = function(list) {
    if(list.length === 0) {
        this.finishedCallback();
        return;
    }

    this.run(list);
};

IntervalQueue.prototype.stop = function() {
    console.log('STOP');
    clearTimeout(this.timer);
};
