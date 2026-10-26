const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register
// Creates a new user and returns a token, so the client can log the
// user in immediately without a separate login step.
async function register(req, res) {
  try {
    const { name, email, fcmToken, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const user = await User.create({ name, email, password, fcmToken: fcmToken || undefined, });

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // .select('+password') because the schema hides password by default.
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
}

// GET /api/auth/me
// Protected route — returns whichever user the token belongs to.
// Useful for the client to check "am I still logged in?" on app start.
async function getMe(req, res) {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email },
  });
}


// PUT /api/auth/update
async function updateUser(req, res) {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: 'Name cannot be empty',
        });
      }

      user.name = name.trim();
    }



    if (req.file) {
      user.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Profile update failed',
      error: error.message,
    });
  }

  
}

const User = require("../models/User");

// GET /api/users/search?search=john@example.com
const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || !search.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const users = await User.find({
      email: { $regex: search.trim(), $options: "i" },
    })
      .select("-password")
      .limit(20);

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};


module.exports = { register, login,updateUser, getMe,searchUsers };
