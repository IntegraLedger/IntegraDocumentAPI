const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const users = require('../models/users');
const config = require('../config/config.json');

exports.signup = (req, res) => {
  const { email, password, first_name, last_name, from } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Invalid Request!' });
  } else {
    users
      .find({ email })
      .then(results => {
        if (results.length === 0) {
          const salt = bcrypt.genSaltSync();
          const hash = bcrypt.hashSync(password, salt);

          const newUser = new users({
            email,
            password: hash,
            first_name,
            last_name,
            from,
          });

          newUser.save();
          const info = {
            id: newUser._id,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            from: newUser.from,
          };
          const token = jwt.sign(info, config.secret, { expiresIn: config.expiresIn });

          res.json({
            succeed: true,
            message: 'User Registered Successfully!',
            user: info,
            token,
          });
        } else {
          res.json({ message: 'User Already Registered!' });
        }
      })
      .catch(err => {
        res.status(500).json({ err });
      });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Invalid Request!' });
  } else {
    users
      .find({ email })
      .then(user => {
        if (user.length === 0) {
          res.json({ message: 'User Not Found!' });
        } else {
          return user[0];
        }
      })
      .then(user => {
        if (bcrypt.compareSync(password, user.password)) {
          const token = jwt.sign(user.toJSON(), config.secret, { expiresIn: config.expiresIn });
          const info = {
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            from: user.from,
          };
          res.json({
            succeed: true,
            message: 'Login Successfully!',
            user: info,
            token,
          });
        } else {
          res.json({ message: 'Invalid Credentials!' });
        }
      })
      .catch(err => {
        res.status(500).json({ err, message: 'User Not Found!' });
      });
  }
};
