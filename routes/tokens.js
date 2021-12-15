const express = require('express');
const multer = require('multer');

const router = express.Router();
const tokens = require('../controllers/tokens');
const verifyToken = require('./verifyToken');

const UPLOAD_BASE_DIR = 'uploads';
const UPLOAD_LIMITS = { fieldSize: 25 * 1024 * 1024 };
const upload = multer({
  dest: UPLOAD_BASE_DIR,
  limits: UPLOAD_LIMITS,
});

router.post('/', tokens.addToken);
router.get('/', verifyToken, tokens.getTokens);
router.post('/status', verifyToken, tokens.updateStatus);
router.post('/pass_phrase', verifyToken, tokens.updatePassphrase);
router.post('/send_sms', verifyToken, tokens.sendSms);
router.post('/email', upload.single('file'), verifyToken, tokens.sendEmail);

module.exports = router;
