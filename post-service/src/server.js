import dotenv from "dotenv";
dotenv.config();

import express from "express";
import postRoutes from "./routes/post-routes.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import errorHandler from "./middlewares/errorHandler.js";
import { connectToRabbitMQ } from "./utils/rabbitmq.js";

const app = express();
const PORT = process.env.PORT || 3002;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
  });

const redisClient = new redis(process.env.REDIS_URL);

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} - ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes,
);

//error handler
app.use(errorHandler);

//unhandled routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} - ${req.url}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service is running on port ${PORT}`);
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
