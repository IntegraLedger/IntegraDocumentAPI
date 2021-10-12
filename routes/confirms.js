const express = require('express');

const router = express.Router();
const confirms = require('../controllers/confirms');

router.post('/phone', confirms.phone);
router.post('/email', confirms.email);

module.exports = router;
