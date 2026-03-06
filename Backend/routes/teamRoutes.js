import express from "express";
import { createTeam, getUserTeams } from "../controllers/teamController.js";
import { isAuthenticated } from "../middlewares/user_auth.js";

const router = express.Router();

router.post("/", isAuthenticated, createTeam);
router.get("/", isAuthenticated, getUserTeams);

export default router;
