const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const DocumentSetsSchema = new Schema({
    name: { type: String, isRequired: true },
    url: { type: String },
});

module.exports = mongoose.model('document_sets', DocumentSetsSchema);
