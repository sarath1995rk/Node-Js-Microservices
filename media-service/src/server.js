import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mediaRoutes from "./routes/media-routes.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import errorHandler from "./middlewares/errorHandler.js";
import { connectToRabbitMQ, consumeMessage } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./event-handlers/media-event-handlers.js";

const app = express();

//db
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("Error connecting to MongoDB", err);
  });

//middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//error handling
app.use((req, res, next) => {
  logger.info(`${req.method} - ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

//routes
app.use("/api/media", mediaRoutes);

//error handler
app.use(errorHandler);

//start server
const PORT = process.env.PORT || 3003;

//rabbitmq
async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume messages
    await consumeMessage("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", err);
  process.exit(1);
});
