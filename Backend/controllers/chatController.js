import Message from "../models/message_model.js";
import User from "../models/user_model.js";

// Get last 50 messages for chat history
export const getChatHistory = async (req, res) => {
  try {
    const { userId, team } = req.query;
    let query = {};

    if (userId) {
      // 1-on-1 private chat
      query = {
        $or: [
          { sender: req.user._id, receiver: userId },
          { sender: userId, receiver: req.user._id },
        ],
      };
    } else if (team) {
      // Team group chat
      query = { team };
    } else {
      // Fallback / edge case
      query = { receiver: null, team: null }; 
    }

    const messages = await Message.find(query)
      .populate("sender", "name role email")
      .sort({ createdAt: 1 }); // Sort chronologically
      
    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all chat contacts (users), sorted by most recently messaged
export const getChatContacts = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all users except current user
    const users = await User.find({ _id: { $ne: currentUserId } }).select("name role email");

    // Find all messages involving the current user (newest first)
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    }).sort({ createdAt: -1 });

    // Map the most recent message time to each user
    const messageTimeMap = {};
    messages.forEach((msg) => {
      const otherUserId = msg.sender.toString() === currentUserId.toString() 
        ? msg.receiver?.toString() 
        : msg.sender?.toString();
      
      if (otherUserId && !messageTimeMap[otherUserId]) {
        messageTimeMap[otherUserId] = msg.createdAt;
      }
    });

    // Sort users by their latest message time (highest first)
    const sortedUsers = users.sort((a, b) => {
      const timeA = messageTimeMap[a._id.toString()] ? new Date(messageTimeMap[a._id.toString()]).getTime() : 0;
      const timeB = messageTimeMap[b._id.toString()] ? new Date(messageTimeMap[b._id.toString()]).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json({
      success: true,
      data: sortedUsers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
