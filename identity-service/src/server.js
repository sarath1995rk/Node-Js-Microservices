import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import identityRoutes from "./routes/identity-routes.js";
import logger from "./utils/logger.js";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import errorHandler from "./middlewares/errorHandler.js";

import redis from "ioredis";

dotenv.config();
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

//DDos protection and rate limiting

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
  //10 request in 1 sec
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Too many requests from ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//Ip based rate limiting
const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Too many requests from ${req.ip}`);
    res.status(429).json({
      success: false,
      message:
        "Too many requests from this IP, please try again after 15 minutes",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply senstive endpoints to routes
app.use("/api/auth/register", ipRateLimiter);

//Routes
app.use("/api/auth", identityRoutes);


//error handler
app.use(errorHandler)

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Identity service is running on port ${PORT}`);
});

//unhandled routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} - ${req.url}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

process.on("unhandledRejection", (reason,promise) => {
  logger.error("Unhandled rejection", promise,"reason:",reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", err);
  process.exit(1);
});