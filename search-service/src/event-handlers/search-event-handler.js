import logger from "../utils/logger.js";
import Search from "../models/search.js";

async function handlePostCreated(message) {
  try {
    const { postId, userId, content, createdAt } = message;
    const newlyCreatedSearch = await Search.create({
      postId,
      userId,
      content,
      createdAt,
    });
    logger.info(`Search created successfully: ${newlyCreatedSearch._id}`);
  } catch (error) {
    logger.error("Error handling post created", error);
  }
}

async function handlePostDeleted(event) {
  try {
    logger.info("Handling post deleted", event);
    // const { postId, userId } = event;
    const deletedSearch = await Search.findOneAndDelete({
      postId: event.postId,
    });
    // const deletedSearch = await Search.deleteMany({ postId, userId });
    logger.info(`Search deleted successfully: ${event.postId}`);
  } catch (error) {
    logger.error("Error handling post deleted", error);
  }
}

export { handlePostCreated, handlePostDeleted };
