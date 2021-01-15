var express = require('express');
var router = express.Router();
var tfa = require('../controllers/tfa');

router.post('/send_email', tfa.sendEmailCode);
router.post('/verify_email', tfa.verifyEmailCode);
router.post('/send_phone', tfa.sendPhoneCode);
router.post('/verify_phone', tfa.verifyPhoneCode);

module.exports = router;
