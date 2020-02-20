var express = require('express');
var router = express.Router();
var users = require('../../controllers/users');
var VerifyToken = require('./VerifyToken');

router.post('/login', users.login);
router.post('/signup', users.signup);

module.exports = router;
