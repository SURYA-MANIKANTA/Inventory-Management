import User from "../models/user_model.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = async (req, res, next) => {
  const { token } = req.cookies;
  console.log("token", token);
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "user is not found or Login first",
    });
  }

  try {
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    req.user = await User.findById(decode._id);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists. Please login again.",
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
