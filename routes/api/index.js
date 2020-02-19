var express = require('express');
var router = express.Router();

const users = require('./users');
const forms = require('./forms');

router.use('/users', users);
router.use('/forms', forms);

module.exports = router;
