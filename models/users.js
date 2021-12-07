const mongoose = require('mongoose');

const { Schema } = mongoose;

const UsersSchema = new Schema({
  email: { type: String, isRequired: true, unique: true },
  password: { type: String, isRequired: true },
  first_name: { type: String },
  last_name: { type: String },
  from: { type: String },
});

module.exports = mongoose.model('users', UsersSchema);
