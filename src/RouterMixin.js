class RouterMixin {
    constructor(options) {
        this.Router = options.constructor;
        this.prefix = options.prefix;
    }
    send() {
        return (req, res) => {
            res.status(res.locals.status).json(res.locals.data);
        }
    }
    parse(options) {
        const router = new this.Router();
        Object.keys(options).forEach(method => {
            const routes = options[method] || [];
            routes.forEach(route => {
                const path = route[0];
                const callbacks = route[1];
                router[method].apply(router, [].concat([path], callbacks, [this.send()]));
            });
        });
        return this.wrap(router);
    }
    wrap(routes) {
        const router = new this.Router();
        router.use(this.prefix, routes);
        return router;
    }
}

module.exports = RouterMixin;