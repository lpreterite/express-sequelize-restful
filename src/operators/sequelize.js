const Sequelize = require('sequelize');
const {
    equal,
    toArray
} = require('../common');

const agreement = "__";

/*
res.locals = {
    // find
    sequelize: { where: {}, order: [], attributes: [], include: {} }
    // create or update or delete
    sequelize: { include: {} }

    store: { sequelize: {}, entity:<sequelize.Model> },
    data: {}
    status: 200
}
*/

function error(next) {
    return (err) => {
        console.error(err);
        next();
    }
}
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

function parserCondition(attributes, allowOperators) {
    allowOperators = typeof allowOperators === 'undefined' ? Object.keys(parseConditionRoles) : allowOperators;
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const where = {};
        Object.keys(req.query).forEach(key => {
            const field = key.split(agreement);
            const attrName = field[0];
            const conditionName = field[1];
            if (attributes.indexOf(attrName) === -1) return;
            if (conditionName && allowOperators.indexOf(conditionName) > -1) {
                where[attrName] = Object.assign({}, where[attrName]);
                where[attrName] = { [Sequelize.Op[conditionName]]: parseQueryValue(conditionName, req.query[key]) };
            } else {
                where[attrName] = req.query[key];
            }
        })
        store.sequelize = Object.assign({}, store.sequelize, { where });
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
        store.sequelize = Object.assign({}, store.sequelize, { current_page, offset, limit });
        res.locals.store = store;
        next();
    };
}
function serializePagination(model, opts) {
    opts = opts || {};
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        model
            .count(Object.assign({}, store.sequelize))
            .then(total => {
                const { limit, offset, current_page } = Object.assign(store.sequelize, { total });
                res.locals.data = Object.assign({
                    current_page,
                    limit,
                    total,
                    offset
                }, { data: res.locals.data });
                next();
            }, error(next));

    }
}

/** ?order=id,desc */

function order(opts) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        const order = [].concat(opts || [], req.query.order || []).map(condition => {
            return toArray(condition);
        });
        store.sequelize = Object.assign({}, store.sequelize, { order });
        res.locals.store = store;
        next();
    };
}


function toJSON() {
    return (data) => {
        return data.toJSON();
    }
}
function caused(todo, next) {
    return (data) => {
        todo(data);
        next();
    }
}
function getEntity(model, opts) {
    opts = opts || {};
    const idField = opts.idField;
    return (req, res, next) => {
        const params = req.params;
        const store = Object.assign({ sequelize: {} }, res.locals.store);
        model
            .findOne({ where: { [idField]: params[idField] }, store })
            .then(caused(result => {
                const store = Object.assign({}, res.locals.store);
                store.entity = result;
                res.locals.store = store;
            }, next), error(next));
    }
}
function fetch(model) {
    return (req, res, next) => {
        const store = Object.assign({ sequelize: {} }, res.locals.store);
        model
            .findAll(store.sequelize)
            .then(caused(result => {
                res.locals.data = result;
                res.locals.status = 200;
            }, next), error(next));
    }
}
function find() {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        if (typeof store.entity === 'undefined') throw new Error('entity is undefined in res.locals.store');
        res.locals.data = store.entity ? store.entity.toJSON() : {};
        res.locals.status = 200;
        next();
    }
}
function create(model) {
    return (req, res, next) => {
        const data = Object.assign({}, req.body);
        const store = Object.assign({}, res.locals.store);
        const sequelize = Object.assign({}, store.sequelize);
        model
            .create(data, sequelize)
            .then(toJSON())
            .then(caused(result => {
                res.locals.data = result;
                res.locals.status = 201;
            }, next), error(next));
    }
}
function update(model) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        if (typeof store.entity === 'undefined') throw new Error('entity is undefined in res.locals.store');
        const data = Object.assign({}, req.body);
        const sequelize = Object.assign({}, store.sequelize);
        store.entity
            .update(data, sequelize)
            .then(toJSON())
            .then(caused(result => {
                res.locals.data = result;
                res.locals.status = 200;
            }, next), error(next));
    };
}
function patch(model) {
    return (req, res, next) => {
        const data = Object.assign({}, req.body);
        const store = Object.assign({}, res.locals.store);
        const sequelize = Object.assign({}, store.sequelize);
        model
            .update(data, sequelize)
            .then(toJSON())
            .then(caused(result => {
                res.locals.data = result;
                res.locals.status = 200;
            }, next), error(next));
    }
}
function del(model) {
    return (req, res, next) => {
        const store = Object.assign({}, res.locals.store);
        if (typeof store.entity === 'undefined') throw new Error('entity is undefined in res.locals.store');
        store.entity
            .destroy()
            .then(caused(() => {
                res.locals.data = store.entity.toJSON();
                res.locals.status = 200;
            }, next), error(next));
    }
}

module.exports = {
    getEntity,
    fetch,
    find,
    create,
    update,
    patch,
    del,
    parserCondition,
    parserPagination,
    serializePagination,
    order,
    error
}