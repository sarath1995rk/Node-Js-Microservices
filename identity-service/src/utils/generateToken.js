import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/refreshToken.js";

const generateToken = async (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      userName: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  ); // 15 minutes
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
  });
  return { accessToken, refreshToken };
};

export default generateToken;
