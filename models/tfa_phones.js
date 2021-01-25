const mongoose = require('mongoose');

const { Schema } = mongoose;

const TFAPhonesSchema = new Schema({
  phone: { type: String, isRequired: true, unique: true },
  phone_code: { type: String },
  phone_verified: { type: Boolean },
});

module.exports = mongoose.model('tfa_phones', TFAPhonesSchema);
