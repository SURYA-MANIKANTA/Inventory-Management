import express from "express";
import { connectdb } from "./db/user_db.js";
import userRouter from "./routes/user_routes.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import productRouter from "./routes/productRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import locationRouter from "./routes/locationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import Message from "./models/message_model.js";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.use(
  cors({
      // methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    // credentials: true,
    // preflightContinue: false,
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectdb();

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/brands", companyRouter);
app.use("/api/v1/location", locationRouter);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/teams", teamRoutes);

// console.log(process.env.FRONTEND_URL);

app.get("/", (req, res) => {
  res.send("<h1>working nicely</h1>");
});

app.use((error, req, res, next) => {
  console.error("Global Error Handler:", error);
  return res.status(400).json({ message: error.message || "internal server error" });
});

// Socket.IO connection event
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Let users join a room (could be their own User ID or a Team Name)
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  // Listen for live chat messages
  socket.on("send_message", async (data) => {
    try {
      const messageData = { sender: data.userId, text: data.text };
      if (data.receiverId) messageData.receiver = data.receiverId;
      if (data.team) messageData.team = data.team;

      const newMsg = await Message.create(messageData);
      const populatedMsg = await newMsg.populate("sender", "name role email");
      
      if (data.team) {
        // Broadcast exactly to the team room
        io.to(data.team).emit("receive_message", populatedMsg);
      } else if (data.receiverId) {
        // Broadcast to receiver's personal room AND sender's personal room
        io.to(data.receiverId).emit("receive_message", populatedMsg);
        // Also emit back to the sender so their other devices update
        io.to(data.userId).emit("receive_message", populatedMsg);
      }
    } catch (error) {
      console.error("Error handling chat message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(process.env.PORT, () => {
  console.log(
    `server is working at port:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});
