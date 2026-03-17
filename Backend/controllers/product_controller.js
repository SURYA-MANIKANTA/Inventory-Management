// controllers/productController.js

import mongoose from "mongoose";
import HistoryModel from "../models/history_model.js";
import LocationModel from "../models/locations_models.js";
import Product from "../models/product_model.js";
import { io } from "../app.js";

export const createProduct = async (req, res) => {
  console.log("Creating product with body:", req.body);
  console.log("Authenticated user:", req.user ? req.user.email : "none");
  
  try {
    const {
      locationId,
      status,
      title,
      description,
      serialNo,
      rackMountable,
      isPart,
      manufacturer,
      model,
      warrantyMonths,
      dateOfPurchase,
      user,
    } = req.body;

    const historyData = {
      location: locationId || null,
      status: [
        {
          name: status,
        },
      ],
    };

    const history = new HistoryModel(historyData);
    await history.save();

    const productData = {
      title,
      description,
      serialNo,
      dateOfPurchase,
      createdBy: req.user._id,
      rackMountable,
      isPart,
      manufacturer: manufacturer || null,
      model,
      warrantyMonths,
      user,
      history: [history._id],
    };

    const product = new Product(productData);
    await product.save();
    
    console.log("Product created successfully:", product._id);
    io.emit("inventory_updated", { action: "create", productId: product._id });
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ error: error.message });
  }
};
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      itemsperpage = 10,
      search = "",
      manufacturer,
    } = req.query;

    let regex = new RegExp(search, "i");

    const query = {
      $or: [
        { title: regex },
        { description: regex },
        { serialNo: regex },
        { model: regex },
      ],
    };

    if (manufacturer) {
      query.manufacturer = mongoose.Types.ObjectId(manufacturer);
    }

    const skipItems = (page - 1) * itemsperpage;

    const totalCount = await Product.countDocuments(query);
    const pages_count = Math.ceil(totalCount / itemsperpage);

    const products = await Product.find(query)
      .skip(skipItems)
      .limit(parseInt(itemsperpage))
      .populate({
        path: "history",
        populate: {
          path: "location",
        },
      })
      .populate("manufacturer");

    res.status(200).json({
      data: products,
      pages_count,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get a single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("createdBy");
    console.log("product", product);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getProductHistroy = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("createdBy")
      .populate({
        path: "history",
        populate: {
          path: "location",
        },
      })
      .populate("manufacturer");

    console.log("product", product);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to update a product by ID
export const updateProductById = async (req, res) => {
  const productId = req.params.id;
  try {
    const {
      locationId,
      status,
      title,
      description,
      serialNo,
      createdBy,
      rackMountable,
      isPart,
      manufacturer,
      model,
      warrantyMonths,
      user,
    } = req.body;

    if (locationId) {
      // Create a new history entry for the location change
      const history = new HistoryModel({
        location: locationId,
        status: [
          {
            name: status,
          },
        ],
      });

      await history.save();

      // Update product information and push the new history entry
      await Product.findByIdAndUpdate(productId, {
        $set: {
          title,
          description,
          serialNo,
          createdBy,
          rackMountable,
          isPart,
          manufacturer,
          model,
          warrantyMonths,
          user,
        },
        $push: {
          history: history._id,
        },
      });
    } else if (status) {
      // Add a new status entry to the existing history
      const productRes = await Product.findById(productId);
      if (!productRes) {
        return res.status(404).json({ error: "Product not found" });
      }
      const historyId = productRes.history[0];
      const his = await HistoryModel.findById(historyId);
      
      // Push the new status object into the history
      his.status.push({
        name: status,
      });

      await his.save();
    } else {
      console.log("Unhandled condition");
    }

    io.emit("inventory_updated", { action: "update", productId });
    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Controller to delete a product by ID
export const deleteProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    io.emit("inventory_updated", { action: "delete", productId: req.params.id });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
