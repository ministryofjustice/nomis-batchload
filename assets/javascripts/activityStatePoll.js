/* eslint-disable */
function pollActivityStatus(previous) {
    $.get('activityStatus', function(activityData) {
        if (activityData.isFilling || activityData.isSending) {
            updatePage(activityData);
            setTimeout(function() {pollActivityStatus(true)}, 1000);
        } else if (previous) {
            location.reload();
        }
    });
}

function updatePage(activityData) {
    $('#stagedIncompleteCount').text(activityData.stagedIncomplete);
    $('#pendingCount').text(activityData.pending);
    $('#rejectedCount').text(activityData.rejected);
    $('#stagedCount').text(activityData.staged);
    $('#sentCount').text(activityData.sent);
}
