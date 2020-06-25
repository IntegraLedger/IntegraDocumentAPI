var express = require('express');
var router = express.Router();

const users = require('./users');
const forms = require('./forms');
const tfa = require('./tfa');

router.use('/users', users);
router.use('/forms', forms);
router.use('/tfa', tfa);

module.exports = router;
