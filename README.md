# express-sequelize-restful
Quickly use sequelize restful api on express

## How to use

### install
``` 
$ npm i -S lpreterite/express-sequelize-restful
```

### use
```
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Router = express.Router;
const { RestfulMixin, operators } = require('express-sequelize-restful');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const restful = new RestfulMixin({ prefix: '/user', constructor: Router });
const router = restful.parse({
    operators: operators.sequelize,
    model: model,
    methods: ['fetch', 'select', 'find', 'create', 'update', 'patch', 'delete']
});

app.use('/api', router);

const http = require('http').Server(app);
const PORT = 3000;
http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});

```