const sgMail = require('@sendgrid/mail');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const tfaEmail = require('../models/tfa_emails');
const tfaPhone = require('../models/tfa_phones');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendEmailCode = (req, res) => {
  const { email } = req.body;
  const newCode = Math.floor(100000 + Math.random() * 900000);

  tfaEmail
    .findOne({ email })
    .then(async result => {
      if (result) {
        result.email_code = newCode;
        result.email_verified = false;
        result.save();
      } else {
        const newEmailRow = new tfaEmail({
          email,
          email_code: newCode,
          email_verified: false,
        });
        newEmailRow.save();
      }
      const msg = {
        to: email,
        from: 'no-reply@integraledger.com',
        subject: 'Verify for Personal Cartridge',
        // eslint-disable-next-line max-len
        html: `<img style="width: 200px;" src="https://hedgefund.z20.web.core.windows.net/img/logo_integra.0da1373e.png"/><br/>Your verification code is: <br/><big>${newCode}</big>`,
      };
      await sgMail.send(msg);
      res.status(200).json({ message: `Code sent to your email: ${email}` });
    })
    .catch(err => {
      res.status(500).json({ err });
    });
};

exports.verifyEmailCode = (req, res) => {
  const { email, code } = req.body;

  tfaEmail
    .findOne({ email })
    .then(async result => {
      if (result) {
        const isVerified = result.email_code === code;
        if (isVerified) {
          result.email_verified = true;
          result.save();
        }
        res.status(200).json({
          verified: result.email_code === code,
          message: result.email_code === code ? 'Your code is verified successfully.' : 'Code verification failed.',
        });
      } else {
        res.status(404).json({ message: 'Please send code to your email first.' });
      }
    })
    .catch(err => {
      res.status(500).json({ err });
    });
};

exports.sendPhoneCode = (req, res) => {
  const { phone } = req.body;
  const newCode = Math.floor(100000 + Math.random() * 900000);

  tfaPhone
    .findOne({ phone })
    .then(async result => {
      if (result) {
        result.phone_code = newCode;
        result.phone_verified = false;
        result.save();
      } else {
        const newPhoneRow = new tfaPhone({
          phone,
          phone_code: newCode,
          phone_verified: false,
        });
        newPhoneRow.save();
      }
      await client.messages.create({
        body: `Your Integra Personal Cartridge code is: ${newCode}`,
        from: process.env.TWILIO_FROM,
        to: phone,
      });
      res.status(200).json({ message: `Code sent to your phone: ${phone}` });
    })
    .catch(err => {
      res.status(500).json({ err });
    });
};

exports.verifyPhoneCode = (req, res) => {
  const { phone, code } = req.body;

  tfaPhone
    .findOne({ phone })
    .then(async result => {
      if (result) {
        const isVerified = result.phone_code === code;
        if (isVerified) {
          result.phone_verified = true;
          result.save();
        }
        res.status(200).json({
          verified: result.phone_code === code,
          message: result.phone_code === code ? 'Your code is verified successfully.' : 'Code verification failed.',
        });
      } else {
        res.status(404).json({ message: 'Please send code to your phone first.' });
      }
    })
    .catch(err => {
      res.status(500).json({ err });
    });
};
