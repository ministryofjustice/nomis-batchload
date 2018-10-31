/* eslint-disable */
function pollActivityStatus(previous) {
    $.get('activityStatus', function(activityData) {
        if (activityData.isFilling || activityData.isSending) {
            updatePage(activityData);
            setTimeout(function() {pollActivityStatus(true)}, 500);
        } else if (previous) {
            location.reload();
        }
    });
}

function updatePage(activityData) {
    $('#stagedIncompleteCount').text(activityData.stagedIncomplete);
    $('#stagedRejectedCount').text(activityData.stagedRejected);
    $('#stagedCount').text(activityData.staged);
    $('#pendingCount').text(activityData.pending);
    $('#rejectedCount').text(activityData.rejected);
    $('#sentCount').text(activityData.sent);
}
