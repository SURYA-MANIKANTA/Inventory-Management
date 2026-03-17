import mongoose from "mongoose";
import dotenv from "dotenv";
import Company from "../models/company_model.js";
import Location from "../models/locations_models.js";
import { connectdb } from "../db/user_db.js";

dotenv.config();

const checkData = async () => {
  try {
    await connectdb();
    console.log("Connected to database");

    const brands = await Company.find({});
    console.log("Brands:", brands.length);
    brands.forEach(b => console.log(`- ${b.name} (${b._id})`));

    const locations = await Location.find({});
    console.log("Locations:", locations.length);
    locations.forEach(l => console.log(`- ${l.name} (${l._id})`));

    process.exit(0);
  } catch (error) {
    console.error("Error checking data:", error);
    process.exit(1);
  }
};

checkData();
