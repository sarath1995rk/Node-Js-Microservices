import logger from "../utils/logger.js";

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  try {
    if (!userId) {
      logger.warn("No user id provided");
      return res.status(401).json({ message: "No user id provided" });
    }
    req.user = { userId };
    next();
  } catch (error) {
    logger.error(`Error authenticating request: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export default authenticateRequest;
