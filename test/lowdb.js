const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Router = express.Router;
const { RestfulMixin, operators } = require('../src');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// db set
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json')
const lodashId = require('lodash-id');
const shortid = require('shortid');
const db = lowdb(adapter);
db._.mixin(lodashId);
db._.mixin({
    createId(coll) {
        const _ = this
        const idProperty = _.__id()
        if(_.isEmpty(coll)) {
            return 1
        } else {
            let id = _(coll).maxBy(idProperty)[idProperty]
            // Increment integer id or generate string id
            return _.isFinite(id) ? ++id : shortid.generate()
        }
    }
})
db.defaults({ user: [] }).write();
// service set
const restful = new RestfulMixin({ prefix: '/user', constructor: Router });
const router = restful.parse(operators.lowdb({
    db: db,
    model: 'user',
    methods: ['fetch', 'select', 'find', 'create', 'update', 'patch', 'delete']
}));

app.use('/', router);

// add post router
const restful2 = new RestfulMixin({ prefix: '/post', constructor: Router });
app.use('/', restful2.parse(operators.lowdb({
    db: db,
    model: 'post',
    methods: ['fetch', 'select', 'find', 'create', 'update', 'patch', 'delete']
})));

const http = require('http').Server(app);
const PORT = 3001;
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