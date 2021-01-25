const express = require('express');

const router = express.Router();

const core = require('./core');
const users = require('./users');
const forms = require('./forms');
const tfa = require('./tfa');
const documentSets = require('./documentSets');

router.use('/', core);
router.use('/api/users', users);
router.use('/api/forms', forms);
router.use('/api/tfa', tfa);
router.use('/api/document_sets', documentSets);

module.exports = router;
