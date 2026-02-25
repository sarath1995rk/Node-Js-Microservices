import Post from "../models/post.js";
import logger from "../utils/logger.js";
import { validateCreatePost } from "../utils/validation.js";
import { publishMessage } from "../utils/rabbitmq.js";

async function invalidatePostCache(req, input) {
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey);
  const cacheKeys = await req.redisClient.keys("posts:*");
  if (cacheKeys.length > 0) {
    await req.redisClient.del(cacheKeys);
  }
}

export const createPost = async (req, res) => {
  logger.info("Creating post");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details?.[0]?.message,
      });
    }

    const { content, mediaIds } = req.body;
    const newlyCreatedPost = await Post.create({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    //publish message to rabbitmq
    await publishMessage("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: req.user.userId,
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info(`Post created successfully: ${newlyCreatedPost._id}`);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newlyCreatedPost,
    });
  } catch (error) {
    logger.error(`Error creating post: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  logger.info("Getting all posts");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedKeys = await req.redisClient.get(cacheKey);
    if (cachedKeys) {
      return res.status(200).json({
        success: true,
        message: "Posts fetched successfully",
        data: JSON.parse(cachedKeys),
      });
    }

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      limit: limit,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    };
    await req.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      "EX",
      60 * 60 * 24,
    );

    return res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      data: result,
    });
  } catch (error) {
    logger.error(`Error getting all posts: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `post:${id}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.status(200).json({
        success: true,
        message: "Post fetched successfully",
        data: JSON.parse(cachedPost),
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    await req.redisClient.set(
      cacheKey,
      JSON.stringify(post),
      "EX",
      60 * 60 * 24,
    );

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error) {
    logger.error(`Error getting post: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const updatePost = async (req, res) => {
  const traceId = req.headers["x-trace-id"];
  try {
    const { id } = req.params;
    const { content, mediaUrls } = req.body;
    const post = await Post.findByIdAndUpdate(
      id,
      { content, mediaUrls },
      { new: true },
    );
    res.status(200).json(post);
  } catch (error) {
    logger.error(`Error updating post: ${error.message}`, { traceId });
    res.status(500).json({ message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndDelete({
      _id: id,
      user: req.user.userId,
    });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //publish message to rabbitmq
    await publishMessage("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, post._id.toString());
    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting post: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};
