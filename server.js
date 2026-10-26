require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoute');
const friendRequestRoutes = require('./routes/friendRequestRoutes');
const initChatSocket = require('./sockets/chatSocket');
const protect = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);

// Socket.io needs to attach to the same HTTP server as Express,
// not run as a separate server — this is what makes that possible.
const io = new Server(server, {
  cors: { origin: '*' }, // tighten this to your app's actual origin in production
});

app.use(cors());
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);

app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user',protect, conversationRoutes);
app.use('/api/user',protect, friendRequestRoutes);


initChatSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
