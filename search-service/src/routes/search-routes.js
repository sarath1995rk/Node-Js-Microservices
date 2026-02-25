import express from "express";
import { searchPosts } from "../controllers/search-controller";
import authenticateRequest from "../middlewares/auth-middleware.js";

const router = express.Router();


router.get("/search", authenticateRequest, searchPosts);

export default router;
