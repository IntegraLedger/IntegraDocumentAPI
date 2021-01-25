const mongoose = require('mongoose');

const { Schema } = mongoose;

const FormsSchema = new Schema({
  name: { type: String, isRequired: true },
  content: [],
  user_id: { type: mongoose.Schema.Types.ObjectId, isRequired: true, ref: 'users' },
});

module.exports = mongoose.model('forms', FormsSchema);
