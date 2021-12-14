const mongoose = require('mongoose');

const { Schema } = mongoose;

const TokensSchema = new Schema({
  email: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  phone_number: { type: String },
  company: { type: String },
  reason: { type: String },
  status: { type: String },
  integra_id: { type: String },
  pass_phrase: { type: String },
});

module.exports = mongoose.model('tokens', TokensSchema);
