function equal(data) {
    return data;
}
function toArray(data) {
    if (data.constructor === Array){
        return data;
    }else{
        return data.split(',').map(item => item.trim());
    }
}


// and
// name="cathy"&name="winnie"
// createdAt={"lt":new Date(), "gt":new Date(new Date() - 24 * 60 * 60 * 1000)}

// or
// sex=1&name__or=["cathy","winnie"]
// rank__or={"lt":1000,"eq":null}
// or={"title":{"like":"Boat%"},"description":{"like":"%boat%"}}

// like
// name__like="cat%";

// in
// id__in=1,2,3;
// id__in=[1,2,3];

const agreement = "__";
const ignoreQueryFields = ['order'];
const otherQueryFields = ['or','and'];
const parseQueryRoles = {
    'and': [decodeURIComponent, JSON.parse],
    'or': [decodeURIComponent, JSON.parse],
    'gt': [equal],
    'gte': [equal],
    'lt': [equal],
    'lte': [equal],
    'ne': [equal],
    'eq': [equal],
    'not': [equal],
    'between': [toArray],
    'notBetween': [toArray],
    'in': [toArray],
    'notIn': [toArray],
    'like': [equal],
    'notLike': [equal],
    'iLike': [equal],
    'notILike': [equal],
    'regexp': [equal],
    'notRegexp': [equal],
    'iRegexp': [equal],
    'notIRegexp': [equal],
    'overlap': [toArray],
    'contains': [toArray],
    'contained': [toArray],
    'any': [toArray],
    'col': [equal],
    'adjacent': [toArray],
    'strictLeft': [toArray],
    'strictRight': [toArray],
    'noExtendRight': [toArray],
    'noExtendLeft': [toArray]
};

function parseQueryValue(condition, value) {
    let result;
    const funs = parseQueryRoles[condition];
    if (typeof funs === 'undefined') result = value;
    else {
        funs.forEach(fun => {
            if (typeof result === 'undefined') result = fun(value);
            else result = fun(result);
        });
    }
    return result;
}
function parseCondition(){
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const where = Object.assign({}, store.where);
        Object.keys(req.query)
            .filter(key => ignoreQueryFields.indexOf(key) === -1 )
            .forEach(key => {
                const field = key.split(agreement);
                const attrName = field[0];
                const conditionName = field[1];
                if (conditionName) {
                    where[attrName] = Object.assign({}, where[attrName], {
                        [conditionName]: parseQueryValue(key, req.query[key])
                    });
                }else{
                    where[key] = parseQueryValue(key, req.query[key]);
                }
            });
        store.where = where;
        res.locals.store = store;
        next();
    }
}

function order(opts) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const order = Object.assign({ fields:[], iteratees:[] }, store.order);

        [].concat(opts || [], req.query.order || []).forEach(condition => {
            const field = toArray(condition);
            order.fields.push(field[0]);
            order.iteratees.push(field[1] || 'asc');
        });
        store.order = order;
        res.locals.store = store;
        next();
    };
}

module.exports = {
    equal,
    toArray,
    parseCondition,
    order
}