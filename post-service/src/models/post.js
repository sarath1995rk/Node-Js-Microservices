import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    mediaIds: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);

//because we will having a diff service for search
postSchema.index({ content: "text" });

const Post = mongoose.model("Post", postSchema);

export default Post;
