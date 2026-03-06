import express from "express";
import { getChatHistory, getChatContacts } from "../controllers/chatController.js";
import { isAuthenticated } from "../middlewares/user_auth.js";

const router = express.Router();

router.get("/", isAuthenticated, getChatHistory);
router.get("/contacts", isAuthenticated, getChatContacts);

export default router;
