module.exports = function () {

        let timer;

        function start(list, method, interval, finishedCallback) {

            if(list.length === 0) {
                finishedCallback();
                return;
            }

            run(list, method, interval, finishedCallback);
        }

        function run(list, method, interval, finishedCallback) {
            const [head, ...tail] = list;

            try {
                method(head);
            } catch (err) {
                // do something
                console.error(err);
            }

            if(tail.length === 0) {
                finishedCallback();
                return;
            }
            timer = setTimeout(() => run(tail, method, interval, finishedCallback), interval);
        }

        function stop() {
            console.log('STOP');
            clearTimeout(timer);
        }

        return {start, stop};
};


