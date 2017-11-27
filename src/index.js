module.exports = {
    RestfulMixin: require('./RestfulMixin'),
    RouterMixin: require('./RouterMixin'),
    operators: {
        sequelize: require('./operators/sequelize'),
        lowdb: require('./operators/lowdb')
    }
}