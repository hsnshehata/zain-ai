const Joi = require('joi');

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message).join(' | ');
      return res.status(400).json({ success: false, message: details });
    }
    req.body = value;
    next();
  };
}

module.exports = { validateBody, Joi };
