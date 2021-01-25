const express = require('express');

const router = express.Router();
const forms = require('../controllers/forms');
const verifyToken = require('./verifyToken');

router.post('/save', verifyToken, forms.save);
router.get('/get/:user_id', verifyToken, forms.getForms);
router.delete('/:form_id', verifyToken, forms.deleteForm);

module.exports = router;
