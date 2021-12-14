const express = require('express');

const router = express.Router();
const tokens = require('../controllers/tokens');
const verifyToken = require('./verifyToken');

router.post('/', tokens.addToken);
router.get('/', verifyToken, tokens.getTokens);
router.post('/status', verifyToken, tokens.updateStatus);
router.post('/pass_phrase', verifyToken, tokens.updatePassphrase);
router.post('/send_sms', verifyToken, tokens.sendSms);

module.exports = router;
