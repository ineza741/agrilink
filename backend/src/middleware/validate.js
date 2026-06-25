const { ZodError } = require("zod");

function validate(schema) {
  return (req, _res, next) => {
    try {
      req.validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

function mapZodError(error) {
  if (!(error instanceof ZodError)) {
    return null;
  }

  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

module.exports = {
  validate,
  mapZodError,
};
