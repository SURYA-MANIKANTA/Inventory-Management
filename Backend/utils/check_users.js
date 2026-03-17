import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user_model.js";
import { connectdb } from "../db/user_db.js";

dotenv.config();

const checkUsers = async () => {
  try {
    await connectdb();
    console.log("Connected to database");

    const users = await User.find({});
    console.log("Current Users:");
    users.forEach(u => {
      console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error checking users:", error);
    process.exit(1);
  }
};

checkUsers();
