import joi from "joi";

const validateCreatePost = (data) => {
  const schema = joi.object({
    content: joi.string().min(3).max(5000).required(),
    mediaIds: joi.array().items(joi.string()).required(),
  });
  return schema.validate(data);
};

export { validateCreatePost };
