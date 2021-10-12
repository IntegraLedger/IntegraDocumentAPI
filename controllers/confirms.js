const sgMail = require('@sendgrid/mail');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.phone = async (req, res) => {
  const retData = {
    status: false,
  };

  try {
    const response = await client.messages.create({
      body: `Integra: your phone verification code is: ${req.body.confirmCode}`,
      from: process.env.TWILIO_FROM,
      to: req.body.phone,
    });

    if (response.error_code) {
      retData.errorMessage = response.error_message;
      retData.errorCode = response.error_code;
    } else {
      retData.status = true;
    }
  } catch (err) {
    retData.errorMessage = err.message;
  }

  res.send(retData);
};

exports.email = async (req, res) => {
  const retData = {
    status: false,
  };

  try {
    const msg = {
      to: req.body.email,
      from: 'no-reply@integraledger.com',
      subject: 'Verify for Attestation document',
      // eslint-disable-next-line max-len
      html: `<img style="width: 200px;" src="https://hedgefund.z20.web.core.windows.net/img/logo_integra.0da1373e.png"/><br/>Your verification code is: <br/><big>${req.body.confirmCode}</big>`,
    };

    await sgMail.send(msg);
    retData.status = true;
  } catch (err) {
    retData.errorMessage = err.message;
  }

  res.send(retData);
};
