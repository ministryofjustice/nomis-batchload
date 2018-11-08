/* eslint-disable */
function pollActivityStatus(previous) {
    $.get('activityStatus', function(activityData) {
        console.log('activityStatePoll - response')
        if (activityData.isFilling || activityData.isSending) {
            console.log('activityStatePoll - updatePage')
            updatePage(activityData);
            setTimeout(function() {pollActivityStatus(true)}, 500);
        } else if (previous) {
            console.log('activityStatePoll - reload')
            location.reload();
        }
    }).fail(function(error) {
            console.log('activityStatePoll - fail')
        alert('error');
        alert(error);
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
