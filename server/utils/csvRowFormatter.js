module.exports = {

    format: function(record) {

        if (record.length !== 3) {
            throw new Error('Invalid number of columns: ' + record.length);
        }

        const cleanedInput = record.map(val => val.trim());

        const offenderNomis = validate(cleanedInput[0], isValidNomis);
        const offenderPnc = validate(cleanedInput[1], isValidPnc);
        const staffId = validate(cleanedInput[2], isValidStaffId);

        const valid = isValidRecord(offenderNomis, staffId);

        return {offenderNomis, offenderPnc, staffId, valid};
    }
};

const emptyValue = '';

function validate(value, validator) {
    return validator(value) ? value : emptyValue;
}

function isValidNomis(value) {
    return value.length > 4;
}

function isValidPnc(value) {
    return value.length > 1;
}

function isValidStaffId(value) {
    return value.length > 0;
}

function isValidRecord(offenderNomis, staffId) {
    return offenderNomis !== '' && staffId !== '';
}
