const R = require('ramda');

module.exports = {
    getIn,
    isEmpty,
    flatten,
    notAllValuesEmpty,
    allValuesEmpty,
    getFirstArrayItems,
    replaceArrayItem,
    lastItem,
    merge,
    mergeWithRight,
    firstItem,
    lastIndex,
    removePath,
    interleave,
    arrayEquals,
    difference,
    getUniqueStrings
};

// pass in your object and a path in array format
// http://ramdajs.com/docs/#path
function getIn(object, pathArray) {
    return R.path(pathArray, object);
}

function isEmpty(item) {
    return R.isEmpty(item) || R.isNil(item);
}

function flatten(array) {
    return R.flatten(array);
}

function allValuesEmpty(object) {
    return R.pipe(R.values, R.all(isEmpty))(object);
}

function notAllValuesEmpty(object) {
    return !allValuesEmpty(object);
}

function getFirstArrayItems(array, number) {
    return R.slice(0, number, array);
}

function replaceArrayItem(array, index, item) {
    return R.update(parseInt(index))(item)(array);
}

function lastItem(array) {
    return R.last(array);
}

function firstItem(array) {
    return R.head(array);
}

function merge(object1, object2) {
    return R.merge(object1, object2);
}

// uses the value on object2 if it key exists on both
function mergeWithRight(object1, object2) {
    return R.mergeDeepRight(object1, object2);
}

function lastIndex(array) {
    return array.length - 1;
}

// pass in path and an object. Using ...args enables currying
function removePath(...args) {
    return R.dissocPath(...args);
}

function interleave(firstArray, secondArray) {
    return flatten(firstArray
        .map((item, index) => [item, secondArray[index] || '']))
        .join('');
}

function arrayEquals(firstArray, secondArray) {
    return R.equals(firstArray, secondArray);
}

function difference(firstArray, secondArray) {
    return R.difference(firstArray, secondArray);
}

function getUniqueStrings(array) {
    const isNotEmpty = item => item.trim();
    return R.pipe(
        R.flatten,
        R.uniq,
        R.filter(isNotEmpty)
    )(array);
}


