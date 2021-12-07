const express = require('express');

const router = express.Router();
const tokens = require('../controllers/tokens');
const verifyToken = require('./verifyToken');

router.post('/', tokens.addToken);
router.get('/', verifyToken, tokens.getTokens);
router.post('/status', verifyToken, tokens.changeStatus);

module.exports = router;
