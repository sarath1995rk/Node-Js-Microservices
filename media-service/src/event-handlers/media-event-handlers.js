import logger from "../utils/logger.js";
import { Media } from "../models/media.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";

const handlePostDeleted = async (event) => {
  try {
    console.log("Received post deleted event", event);
    const { postId, mediaIds } = event;
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(`Deleted media file for post ${postId}`);
    }

    //Another method
    // await Media.deleteMany({ _id: { $in: mediaIds } });
  } catch (error) {
    logger.error("Error handling post deleted event", error);
  }
};

export { handlePostDeleted };
