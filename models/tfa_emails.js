const mongoose = require('mongoose');

const { Schema } = mongoose;

const TFAEmailsSchema = new Schema({
  email: { type: String, isRequired: true, unique: true },
  email_code: { type: String },
  email_verified: { type: Boolean },
});

module.exports = mongoose.model('tfa_emails', TFAEmailsSchema);
