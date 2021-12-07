const tokens = require('../models/tokens');

exports.addToken = (req, res) => {
  const { first_name, last_name, phone_number, email, company, reason } = req.body;

  const newToken = new tokens({
    first_name,
    last_name,
    phone_number,
    email,
    company,
    reason,
  });
  newToken.save();
  res.status(200).json({ succeed: true, message: 'Successfully saved token!' });
};

exports.getTokens = (req, res) => {
  tokens
    .find({})
    .then(list => {
      res.status(200).json({ succeed: true, list });
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

exports.changeStatus = (req, res) => {
  const { id, status } = req.body;
  tokens
    .findById(id)
    .then(async token => {
      token.status = status;
      await token.save();
      res.status(200).json({ succeed: true, token });
    })
    .catch(err => {
      res.status(500).json(err);
    });
};
