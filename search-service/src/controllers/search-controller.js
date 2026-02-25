import logger from "../utils/logger";
import Search from "../models/search.js";

const searchPosts = async (req, res) => {
  logger.info("search endpoint hit");
  try {
    const { query } = req.query;
    const posts = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(20);
    res.json({ success: true, data: posts });
  } catch (error) {
    logger.error("Error searching posts", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {searchPosts};
