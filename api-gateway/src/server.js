import dotenv from "dotenv";
import express from "express";
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import cors from "cors";
import redis from "ioredis";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import proxy from "express-http-proxy";
import validateToken from "./middleware/auth-middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new redis(process.env.REDIS_URL);

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(errorHandler);
app.use((req, res, next) => {
  logger.info(`${req.method} - ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

//Ip based rate limiting
const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

app.use(ipRateLimiter);

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err?.message}`);
    res.status(500).json({
      success: false,
      message: `Internal server error ${err?.message}`,
    });
  },
};

//setting up proxy for identity service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, req) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["Accept"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from identity service: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  }),
);

//setting up proxy for post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, req) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["Accept"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = req.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from post service: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  }),
);

//setting up proxy for media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"]?.startsWith("multipart/form-data")) {
        proxyReqOpts.headers["content-type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from media service: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  }),
);

//setting up proxy for search service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, req) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["Accept"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = req.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from search service: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  }),
);
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(`Identity service URL: ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Post service URL: ${process.env.POST_SERVICE_URL}`);
  logger.info(`Media service URL: ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`Search service URL: ${process.env.SEARCH_SERVICE_URL}`);
  logger.info(`Redis URL: ${process.env.REDIS_URL}`);
});

//To run and stop rabbit mq

// brew services start rabbitmq
// brew services stop rabbitmq

//To run redis

// brew services start redis
// brew services stop redis
// redis-server
