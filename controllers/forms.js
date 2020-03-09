const forms = require('../models/forms');

exports.save = (req, res) => {
    const { name, content, user_id } = req.body;

    const newForms = new forms({
        name,
        content,
        user_id
    });
    newForms.save();
    res.status(200).json({ succeed: true, message: "Successfully saved form!" });
}

exports.getForms = (req, res) => {
    const { user_id } = req.params;

    forms.find({user_id})
        .then(forms => {
            res.status(200).json({ succeed: true, list: forms });
        })
        .catch((err) => {
            res.status(500).json(err);
        })
}

exports.deleteForm = (req, res) => {
    const { form_id } = req.params;

    forms.findById(form_id)
        .then(form => {
            form.remove();
            if (req.user._id == form.user_id) {
                res.status(200).json({ succeed: true, message: 'Successfully deleted form!' });
            } else {
                res.status(200).json({ succeed: false, message: 'You are trying to delete unauthorized form!' });
            }
        })
        .catch((err) => {
            res.status(500).json(err);
        })
}
