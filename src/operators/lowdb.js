const {
    equal,
    toArray,
    parseCondition,
    order
} = require('../common');

function error(next) {
    return (err) => {
        console.error(err);
        next();
    }
}
function caused(todo, next) {
    return (data) => {
        todo(data);
        next();
    }
}
function getEntity(db, model, opts) {
    opts = opts || {};
    const idField = opts.idField;
    return (req, res, next) => {
        const params = req.params;
        const store = Object.assign({ lowdb: {} }, res.locals.store);
        store.entity = db.get(model).getById(params[idField]);
        res.locals.store = store;
        next();
    }
}
function fetch(db, model) {
    return (req, res, next) => {
        const store = Object.assign({ lowdb: {} }, res.locals.store);
        const where = store.where || function(){ return true };
        const order = Object.assign({ fields: [], iteratees: [] }, store.order);
        const result = db.get(model)
            .orderBy(
                order.fields,
                order.iteratees
            )
            .filter(where)
            .cloneDeep()
            .value();
        res.locals.data = result;
        res.locals.status = 200;
        next();
    }
}
function find() {
    return (req, res, next) => {
        const store = Object.assign({ lowdb: {} }, res.locals.store);
        res.locals.data = store.entity.clone().value();
        res.locals.status = 200;
        next();
    }
}
function create(db, model) {
    return (req, res, next) => {
        const data = Object.assign({}, req.body);
        const store = Object.assign({}, res.locals.store);
        const result = db.get(model).insert(data).write();
        res.locals.data = result;
        res.locals.status = 201;
        next();
    }
}
function update(db, model) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        if (typeof store.entity === 'undefined') throw new Error('entity is undefined in res.locals.store');
        const data = Object.assign({}, req.body);
        const result = store
            .entity
            .assign(data)
            .write();

        res.locals.data = result;
        res.locals.status = 200;
        next();
    }
}
function del(db, model, opts) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const params = req.params;
        const delData = store.entity.clone().value();
        db
            .get(model)
            .removeById(delData.id)
            .write();
        res.locals.data = delData;
        res.locals.status = 200;
        next();
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

/*
var where = [function(item){ return item.sex==0 }, function(item){ return item.name=="cathy"||item.name=="winnie" }];
var items = [ {sex:1, name:"packy"}, {sex:0, name:"cathy"}, {sex:0,name:"winnie"} ];

console.log(JSON.stringify(items.filter(item=>{
    return where.every(fun=>fun(item));
})));

> "[{"sex":0,"name":"cathy"},{"sex":0,"name":"winnie"}]"
*/
const agreement = "__";
const parseConditionRoles = {
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
    const funs = parseConditionRoles[condition];
    if (typeof funs === 'undefined') result = value;
    else {
        funs.forEach(fun => {
            if (typeof result === 'undefined') result = fun(value);
            else result = fun(result);
        });
    }
    return result;
}
const conditions = {
    'and': function(query){
        return function(value){
            return true;
        }
    },
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
function getCondition(conditionName, value){
    return conditions[conditionName](parseQueryValue(value));
}
function parseQuery(attr, condition){
    return function(item){
        return condition(item[attr]);
    }
}

function parserCondition(allowOperators, ignores) {
    ignores = [].concat(['order']);
    allowOperators = typeof allowOperators === 'undefined' ? Object.keys(parseConditionRoles) : allowOperators;
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const where = function (filters){
            return function (item){
                return filters.every(fun => fun(item));
            }
        };
        const filters = [];
        Object.keys(req.query).forEach(key => {
            if (ignores.indexOf(key) > -1) return;
            const field = key.split(agreement);
            const attrName = field[0];
            const conditionName = field[1];
            if (conditionName && allowOperators.indexOf(conditionName) > -1) {
                const filter = parseQuery(attrName, getCondition(conditionName, req.query[key]));
                filters.push(filter);
            } else {
                filters.push(item => { item[key] === req.query[key] });
            }
        });
        // const where = {};
        // Object.keys(req.query).forEach(key => {
        //     if (ignores.indexOf(key) > -1) return;
        //     const field = key.split(agreement);
        //     const attrName = field[0];
        //     const conditionName = field[1];
        //     if (conditionName && allowOperators.indexOf(conditionName) > -1) {
        //         where[attrName] = Object.assign({}, where[attrName]);
        //         where[attrName] = { [conditionName]: parseQueryValue(conditionName, req.query[key]) };
        //     } else {
        //         where[attrName] = req.query[key];
        //     }
        // })
        store.lowdb = Object.assign({}, store.lowdb, { where: where(filters) });
        res.locals.store = store;
        next();
    }
}
function parserPagination(opts) {
    opts = opts || {};
    return (req, res, next) => {
        const limit = opts.limit || 10;
        const current_page = req.query.page || 1;
        const offset = (current_page - 1) * limit;
        const store = Object.assign({}, res.locals.store);
        store.lowdb = Object.assign({}, store.lowdb, { current_page, offset, limit });
        res.locals.store = store;
        next();
    };
}
function serializePagination(db, model, opts) {
    opts = opts || {};
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const fetcher = db.get(model).filter(store.lowdb.where).orderBy(store.lowdb.order);
        const total = fetcher.count().value();
        const { limit, offset, current_page } = Object.assign(store.lowdb, { total });
        res.locals.data = Object.assign({
            current_page,
            limit,
            total,
            offset
        }, { data: res.locals.data });

        next();
    }
}


function getRoutes(db, model) {
    return {
        'fetch': [
            '/search',
            [fetch(db, model)]
        ],
        'select': [
            '/',
            [fetch(db, model)],
        ],
        'find': [
            '/:id(\\d+)',
            [getEntity(db, model, { idField: db._.__id() }), find()],
        ],
        'create': [
            '/',
            [create(db, model)],
        ],
        'update': [
            '/:id(\\d+)',
            [getEntity(db, model, { idField: db._.__id() }), update(db, model)],
        ],
        'patch': [
            '/:id(\\d+)',
            [getEntity(db, model, { idField: db._.__id() }), update(db, model)],
        ],
        'delete': [
            '/:id(\\d+)',
            [getEntity(db, model, { idField: db._.__id() }), del(db, model)],
        ],
    };
}

module.exports = function ({ db, model, methods }) {
    return {
        db,
        model,
        methods: methods,
        hooks: {
            before: {
                fetch: [parserPagination(), parseCondition(), order()],
                select: [parseCondition(), order()]
            },
            after: {
                fetch: [serializePagination(db, model)]
            }
        },
        operations: {
            getEntity,
            fetch,
            find,
            create,
            update,
            del,
            parserCondition,
            parserPagination,
            serializePagination,
            order,
            error
        },
        routes: getRoutes(db, model)
    }
}