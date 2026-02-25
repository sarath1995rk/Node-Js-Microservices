import express from "express";
import {
  createPost,
  getAllPosts,
  getSinglePost,
  deletePost,
} from "../controllers/post-controller.js";
import authenticateRequest from "../middlewares/auth-middleware.js";

const router = express.Router();

router.use(authenticateRequest);

router.post("/create-post", createPost);

router.get("/all-posts", getAllPosts);

router.get("/all-posts/:id", getSinglePost);

router.delete("/delete-post/:id", deletePost);

export default router;
