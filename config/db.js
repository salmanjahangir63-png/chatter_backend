const mongoose = require('mongoose');

// Connects to MongoDB using the URI from .env.
// Called once when the server starts (see server.js).
async function connectDB() {
  try {

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
