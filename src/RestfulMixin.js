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
    parse(options) {
        // 获得 operator 然后合并methods与hooks生成路由
        const model = options.model;
        const hooks = Object.assign({ before: {}, after: {} }, options.hooks);
        const methods = options.methods;
        const result = {};
        const routes = options.routes;

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