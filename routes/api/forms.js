var express = require('express');
var router = express.Router();
var forms = require('../../controllers/forms');

router.post('/save', forms.save);
router.get('/get', forms.getForms);

module.exports = router;
