var express = require('express');
var router = express.Router();
var forms = require('../controllers/forms');
var verifyToken = require('./verifyToken');

router.post('/save', verifyToken, forms.save);
router.get('/get/:user_id', verifyToken, forms.getForms);
router.delete('/:form_id', verifyToken, forms.deleteForm);

module.exports = router;
