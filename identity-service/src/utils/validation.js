import joi from "joi";

const validateRegisterUser = (data) => {
  const schema = joi.object({
    username: joi.string().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(30).required(),
  });
  return schema.validate(data);
};

const validateLoginUser = (data) => {
  const schema = joi.object({
    username: joi.optional(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(30).required(),
  });
  return schema.validate(data);
};

export { validateRegisterUser, validateLoginUser };
