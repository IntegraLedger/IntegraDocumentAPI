const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const FormsSchema = new Schema({
    name: { type: String, isRequired: true },
    content : []
});

module.exports = mongoose.model('forms', FormsSchema);
