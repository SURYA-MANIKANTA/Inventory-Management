import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product_model.js";
import HistoryModel from "../models/history_model.js";
import User from "../models/user_model.js";
import LocationModel from "../models/locations_models.js";
import { connectdb } from "../db/user_db.js";

dotenv.config();

const testAddProduct = async () => {
  try {
    await connectdb();
    console.log("Connected to database");

    const anyUser = await User.findOne();
    if (!anyUser) {
      console.error("No user found for testing");
      process.exit(1);
    }

    const location = await LocationModel.findOne();
    if (!location) {
        console.error("No location found for testing");
        process.exit(1);
    }

    const testData = {
      locationId: location._id,
      status: "in use",
      title: "Test Product " + Date.now(),
      description: "Test Description",
      serialNo: "SN" + Date.now(),
      rackMountable: true,
      isPart: false,
      manufacturer: new mongoose.Types.ObjectId(), // Fake one for test if none exists
      model: "XT-100",
      warrantyMonths: 12,
      dateOfPurchase: new Date(),
      user: "normal user",
    };

    // Simulate the logic in createProduct controller
    const history = new HistoryModel({
      location: testData.locationId,
      status: [{ name: testData.status }],
    });
    await history.save();

    const product = new Product({
      ...testData,
      createdBy: anyUser._id,
      history: [history._id],
    });
    await product.save();

    console.log("Successfully created test product:", product.title);
    
    // Cleanup
    await Product.findByIdAndDelete(product._id);
    await HistoryModel.findByIdAndDelete(history._id);
    console.log("Cleanup successful");
    
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

testAddProduct();
