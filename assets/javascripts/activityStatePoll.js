/* eslint-disable */
function pollActivityStatus(previous) {
    $.get('activityStatus', function(activityData) {
        console.log(activityData.isFilling)
        console.log(activityData.isSending)
        console.log(previous)
        if (activityData.isFilling || activityData.isSending) {
            updatePage(activityData);
            setTimeout(function() {
                pollActivityStatus(true)
            }, 1000);
        } else if (previous) {
            location.reload();
        }
    }).fail(function(error) {
        console.log(error)
    });
}

function updatePage(activityData) {
    $('#incompleteCount').text(activityData.incompleteCount);
    $('#duplicateCount').text(activityData.duplicateCount);
    $('#completeCount').text(activityData.completeCount);
    $('#fillRejectedCount').text(activityData.fillRejectedCount);

    $('#pendingCount').text(activityData.pending);
    $('#rejectedCount').text(activityData.rejected);
    $('#sentCount').text(activityData.sent);
}
