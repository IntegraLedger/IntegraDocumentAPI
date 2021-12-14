const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const tokens = require('../models/tokens');

exports.addToken = (req, res) => {
  const { first_name, last_name, phone_number, email, company, reason, integra_id } = req.body;

  const newToken = new tokens({
    first_name,
    last_name,
    phone_number,
    email,
    company,
    reason,
    integra_id,
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

exports.updateStatus = (req, res) => {
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

exports.updatePassphrase = (req, res) => {
  const { id, pass_phrase } = req.body;
  tokens
    .findById(id)
    .then(async token => {
      token.pass_phrase = pass_phrase;
      await token.save();
      res.status(200).json({ succeed: true, token });
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

exports.sendSms = async (req, res) => {
  const retData = {
    succeed: false,
  };

  try {
    const response = await client.messages.create({
      body: `Integra: your pass phrase is: ${req.body.pass_phrase}`,
      from: process.env.TWILIO_FROM,
      to: req.body.phone,
    });

    if (response.error_code) {
      retData.errorMessage = response.error_message;
      retData.errorCode = response.error_code;
    } else {
      retData.succeed = true;
    }
  } catch (err) {
    retData.errorMessage = err.message;
  }

  res.send(retData);
};
