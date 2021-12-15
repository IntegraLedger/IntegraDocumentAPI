const fs = require('fs');
const sgMail = require('@sendgrid/mail');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const tokens = require('../models/tokens');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

exports.sendEmail = async (req, res) => {
  try {
    const { email, filename, integra_id } = req.body;
    const attachment = fs.readFileSync(req.file.path).toString('base64');
    const subject = 'New Integra Encrypted Document';
    const template =
      'The tokens you requested have been issued!<br><br>' +
      // eslint-disable-next-line max-len
      `Contained within this email is an encrypted attachment containing the tokens that were issued to your IntegraId of ${integra_id}.<br><br>` +
      // eslint-disable-next-line max-len
      `In order to access the contents of the encrypted document you will need the decryption key that was sent to the phone number that was used when the tokens were requested.
    <br><br>
      Go to https://purchase.integraledger.com and follow the instructions within the PDF document to redeem these tokens.
    <br><br>
      Thanks for using Integra!!<br>`;

    const msg = {
      to: email,
      from: 'tokens@integraledger.com',
      subject,
      html: template,
      attachments: [
        {
          content: attachment,
          filename,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
    res.send({ success: true });
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};
