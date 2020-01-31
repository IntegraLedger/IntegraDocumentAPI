const forms = require('../models/forms');

exports.save = (req, res) => {
    const { name, content } = req.body;

    const newForms = new forms({
        name,
        content
    });
    newForms.save();
    res.status(200).json({ succeed: true, message: "Successfully saved form!" });
}

exports.getForms = (req, res) => {
    forms.find({})
        .then(forms => {
            res.status(200).json({ succeed: true, list: forms });
        })
        .catch((err) => {
            res.status(500).json(err);
        })
}
