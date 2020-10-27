const documentSets = require('../models/document_sets');

exports.getTypes = (req, res) => {
  documentSets.find({})
    .then(sets => {
      res.status(200).json({ document_sets: sets });
    })
    .catch((err) => {
      res.status(500).json(err);
    })
}

exports.createType = (req, res) => {
  const { name, url } = req.body;

  const newSet = new documentSets({
    name,
    url
  });
  newSet.save();
  res.status(200).json({ succeed: true, message: "New document set created!" });
}
