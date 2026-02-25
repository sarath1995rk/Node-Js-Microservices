import User from "../models/user.js";
import RefreshToken from "../models/refreshToken.js";
import logger from "../utils/logger.js";
import {
  validateRegisterUser,
  validateLoginUser,
} from "../utils/validation.js";
import generateToken from "../utils/generateToken.js";

//user registration

const registerUser = async (req, res, next) => {
  logger.info("Registering user");
  try {
    const { error } = validateRegisterUser(req.body);
    if (error) {
      logger.warn("Validation error: ", error.details[0]?.message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0]?.message });
    }
    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists: ", user?._id);
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    const newUser = await User.create({ username, email, password });

    const { accessToken, refreshToken } = await generateToken(newUser);
    logger.info("User registered successfully: ", newUser?._id);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: newUser?._id,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error registering user: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

//user login

const loginUser = async (req, res, next) => {
  logger.info("Logging in user");
  try {
    const { error } = validateLoginUser(req.body);
    if (error) {
      logger.warn("Validation error: ", error.details[0]?.message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0]?.message });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found: ", email);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn("Invalid password: ", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }
    const { accessToken, refreshToken } = await generateToken(user);
    logger.info("User logged in successfully: ", user?._id);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      userId: user?._id,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error logging in user: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

//refresh token

const refreshTokenUser = async (req, res, next) => {
  logger.info("Refreshing token");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not found");
      return res
        .status(401)
        .json({ success: false, message: "Refresh token not found" });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < Date.now()) {
      logger.warn("Invalid or expired refresh token");
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      logger.warn("User not found: ", storedToken.userId);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    //delete old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    logger.info("Token refreshed successfully: ", user?._id);
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Error refreshing token: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

//logout
const logoutUser = async (req, res, next) => {
  logger.info("Logging out user");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not found");
      return res
        .status(401)
        .json({ success: false, message: "Refresh token not found" });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < Date.now()) {
      logger.warn("Invalid or expired refresh token");
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }
    await RefreshToken.deleteOne({ _id: storedToken._id });

    logger.info("User logged out successfully: ", storedToken.user);
    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    logger.error("Error logging out user: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export { registerUser, loginUser, refreshTokenUser, logoutUser };
