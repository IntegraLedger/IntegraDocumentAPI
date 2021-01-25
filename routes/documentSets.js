const express = require('express');

const router = express.Router();
const documentSets = require('../controllers/documentSets');

router.get('/', documentSets.getTypes);
router.post('/', documentSets.createType);

module.exports = router;
