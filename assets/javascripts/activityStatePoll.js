/* eslint-disable */
function pollActivityStatus(previous) {
    $.get('activityStatus', function(status) {
        if (status.isFilling || status.isSending) {
            setTimeout(function() {pollActivityStatus(true)}, 1000);
        } else if (previous) {
            location.reload();
        }
    });
}

