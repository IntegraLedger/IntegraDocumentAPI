var express = require('express');
var router = express.Router();
var forms = require('../../controllers/forms');
var VerifyToken = require('./VerifyToken');

router.post('/save', VerifyToken, forms.save);
router.get('/get', VerifyToken, forms.getForms);

module.exports = router;
