const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Router = express.Router;
const { RestfulMixin, operators } = require('../src');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// db set
const Sequelize = require('sequelize');
const sequelize = new Sequelize('sequelize', '', '', {
    dialect: 'sqlite',
    logging: false,
    storage: path.join(__dirname, '../db.sqlite')
});

const user = sequelize.define('users', {
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    nicename: Sequelize.STRING(36),
    username: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
    },
    roles: Sequelize.STRING
}, {
    classMethods: {
        associate: function (models) {
            user.hasMany(models.user_meta, { as: 'meta', 'foreignKey': 'uid' });
        }
    },
    freezeTableName: true,
    timestamps: true, //add createAt and updateAt
    createdAt: 'registeredAt'
});

const userMeta = sequelize.define('user_meta', {
    uid: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    key: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    value: Sequelize.TEXT
}, {
    freezeTableName: true
});

if (user.associate){
    user.associate({ user_meta: userMeta });
}
sequelize.sync();

// service set
const restful = new RestfulMixin({ prefix: '/user', constructor: Router });
const router = restful.parse(operators.sequelize({
    model: user,
    methods: ['fetch', 'select', 'find', 'create', 'update', 'patch', 'delete']
}));
app.use('/', router);

const http = require('http').Server(app);
const PORT = 3000;
http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});


// test 
const request = require('supertest');
const server = http;

describe('User', function () {
    it('find all', function (done) {
        request(server)
            .get('/user')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });

    it('get one', function (done) {
        request(server)
            .get('/user/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });

    it('create', function (done) {
        let name = 'Packy' + Date.now();
        let user = {
            email: name + '@uxfeel.com',
            username: name,
            password: '123456',
            meta: [
                {
                    key: 'sex',
                    value: '1'
                },
                {
                    key: 'avatar',
                    value: '/avatar-1.png'
                }
            ]
        };
        request(server)
            .post('/user')
            .send(user)
            .expect('Content-Type', /json/)
            .expect(201, done);
    });

    it('patch', function (done) {
        this.timeout(30000);
        request(server)
            .get('/user')
            .end((err, res) => {
                let user = res.body.pop();
                request(server)
                    .put('/user/' + user.id)
                    .send({
                        id: user.id,
                        nicename: user.username
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect((res) => {
                        if (res.body.password !== user.password) throw new Error('password do not updated!');
                    })
                    .end(done);
            });
    });

    it('Query the user names contain Packy', function (done) {
        request(server)
            .get('/user')
            .query({ email: { $like: 'Packy' } }) //encodeURIComponent('?email[$like]=Packy')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });

    it('update', function (done) {
        this.timeout(30000);
        request(server)
            .get('/user')
            .end((err, res) => {
                let user = res.body.pop();
                user.password = "654321";
                request(server)
                    .put('/user/' + user.id)
                    .send(user)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect((res) => {
                        if (res.body.password !== user.password) throw new Error('password do not updated!');
                    })
                    .end(done);
            });
    });

    it('delete', function (done) {
        this.timeout(30000);
        request(server)
            .get('/user')
            .end((err, res) => {
                let user = res.body.pop();
                request(server)
                    .del('/user/' + user.id)
                    .expect('Content-Type', /json/)
                    .expect(200, done);
            });
    });
});