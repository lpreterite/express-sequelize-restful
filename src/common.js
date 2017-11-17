function equal(data) {
    return data;
}
function toArray(data) {
    return data.split(',').map(item => item.trim());
}

module.exports = {
    equal,
    toArray
}