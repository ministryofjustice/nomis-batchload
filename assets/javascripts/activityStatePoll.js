/* eslint-disable */
function pollFilling(previous) {
    $.get('filling', function(isFilling) {
        if (isFilling) {
            setTimeout(function() {pollFilling(true)}, 1000);
        } else if (previous) {
            location.reload();
        }
    });
}

