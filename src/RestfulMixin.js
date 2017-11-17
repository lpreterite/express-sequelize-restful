const RouterMixin = require('./RouterMixin');

const methodTypes = {
    "fetch": 'get',
    "select": 'get',
    "find": 'get',
    "create": 'post',
    "update": 'put',
    "patch": 'patch',
    "delete": 'delete',
};
class RestfulMixin extends RouterMixin {
    getRoutes(model, {
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
    }) {
        return {
            'fetch': [
                '/search',
                [parserPagination(), parserCondition(Object.keys(model.attributes)), order(), fetch(model), serializePagination(model)]
            ],
            'select': [
                '/',
                [parserCondition(Object.keys(model.attributes)), order(), fetch(model)],
            ],
            'find': [
                '/:id(\\d+)',
                [getEntity(model, { idField: 'id' }), find()],
            ],
            'create': [
                '/',
                [create(model)],
            ],
            'update': [
                '/:id(\\d+)',
                [getEntity(model, { idField: 'id' }), update(model)],
            ],
            'patch': [
                '/:id(\\d+)',
                [patch(model)],
            ],
            'delete': [
                '/:id(\\d+)',
                [getEntity(model, { idField: 'id' }), del(model)],
            ],
        };
    }
    parse(options) {
        const model = options.model;
        const hooks = Object.assign({ before: {}, after: {} }, options.hooks);
        const methods = options.methods;
        const result = {};
        const routes = this.getRoutes(model, options.operators);

        methods.forEach(method => {
            const router = result[methodTypes[method]] || [];

            const befores = hooks.before[method] || [];
            const afters = hooks.after[method] || [];
            const route = routes[method];
            router.push([route[0], [].concat(befores, route[1], afters)]);

            result[methodTypes[method]] = [].concat(router);
        });

        return super.parse(result);
    }
}
module.exports = RestfulMixin;