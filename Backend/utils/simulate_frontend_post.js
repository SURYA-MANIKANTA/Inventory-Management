import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user_model.js";
import Location from "../models/locations_models.js";
import Company from "../models/company_model.js";
import { connectdb } from "../db/user_db.js";
import jwt from "jsonwebtoken";

dotenv.config();

const simulateFrontendPost = async () => {
  try {
    await connectdb();
    const user = await User.findOne();
    const location = await Location.findOne();
    const manufacturer = await Company.findOne();

    if (!user || !location || !manufacturer) {
        console.error("Missing test data");
        process.exit(1);
    }

    // Create a token for authentication
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY);

    const formData = {
        locationId: location._id.toString(),
        status: "in use",
        title: "Simulation Test " + Date.now(),
        description: "Simulated from script",
        serialNo: "SIM" + Date.now(),
        rackMountable: true,
        isPart: false,
        manufacturer: manufacturer._id.toString(),
        model: "SIM-2026",
        warrantyMonths: 24,
        user: "normal user",
        dateOfPurchase: "2026-03-17T21:00",
    };

    console.log("Sending POST to /api/v1/products");
    try {
        const response = await axios.post(`http://localhost:5001/api/v1/products`, formData, {
            headers: {
                "Content-Type": "application/json",
                "Cookie": `token=${token}`
            }
        });
        console.log("Success! Status:", response.status);
        console.log("Data:", response.data._id);
    } catch (error) {
        console.error("Post failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Error data:", error.response.data);
        } else {
            console.error("Error message:", error.message);
        }
    }

    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
};

simulateFrontendPost();
