import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";
import { Media } from "../models/media.js";

const uploadMedia = async (req, res) => {
  logger.info("Media upload request received");
  try {
    const file = req.file;
    if (!file) {
      logger.error("No file uploaded");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(
      `File details: name: ${originalname}, type : ${mimetype}, ${buffer}`,
    );

    logger.info("Started uploading to cloudinary");
    const result = await uploadMediaToCloudinary(file);
    logger.info("Cloudinary upload successful", result.public_id);
    const newlyCreatedMedia = new Media({
      publicId: result.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: result.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();
    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
    });
  } catch (error) {
    logger.error("Error uploading media", error);
    return res
      .status(500)
      .json({ message: "Error uploading media", success: false });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const media = await Media.find();
    return res.status(200).json({ success: true, media });
  } catch (error) {
    logger.error("Error getting all media", error);
    return res
      .status(500)
      .json({ message: "Error getting all media", success: false });
  }
};
export { uploadMedia, getAllMedia };
