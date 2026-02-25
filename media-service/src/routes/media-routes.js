import express from "express";
import { uploadMedia, getAllMedia } from "../controllers/media-controller.js";
import authenticateRequest from "../middlewares/auth-middleware.js";
import multer from "multer";
import logger from "../utils/logger.js";

const router = express.Router();

//configure multer for upload file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading file", err);
        return res.status(400).json({
          success: false,
          message: "Multer error while uploading",
          error: err?.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Error while uploading file", err);
        return res.status(500).json({
          success: false,
          message: "Error while uploading",
          error: err?.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.warn("No file uploaded");
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }
      next();
    });
  },
  uploadMedia,
);

router.get("/get", authenticateRequest, getAllMedia);

export default router;
