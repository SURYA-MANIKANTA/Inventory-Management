import Team from "../models/team_model.js";

// Create a new custom team channel
export const createTeam = async (req, res) => {
  try {
    const { name, members } = req.body;
    
    // Validate input
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide a team name and at least one member." 
      });
    }

    // Always include the creator as a member
    const newMembers = new Set([...members, req.user._id.toString()]);
    
    const newTeam = await Team.create({
      name,
      members: Array.from(newMembers),
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      team: newTeam,
      message: "Team channel created successfully!"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all teams where the current logged-in user is a member
export const getUserTeams = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    const teams = await Team.find({ members: currentUserId })
      .populate("members", "name role email")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      teams
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
