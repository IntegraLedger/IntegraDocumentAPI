var express = require('express');
var router = express.Router();

const users = require('./users');
const forms = require('./forms');
const tfa = require('./tfa');
const documentSets = require('./documentSets');

router.use('/users', users);
router.use('/forms', forms);
router.use('/tfa', tfa);
router.use('/document_sets', documentSets);

module.exports = router;
