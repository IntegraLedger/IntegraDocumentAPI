var express = require('express');
var router = express.Router();
var documentSets = require('../controllers/documentSets');

router.get('/', documentSets.getTypes);
router.post('/', documentSets.createType);

module.exports = router;
