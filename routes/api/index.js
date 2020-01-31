var express = require('express');
var router = express.Router();

const forms = require('./forms');

router.use('/forms', forms);

module.exports = router;
