# Node Chat App

A simple backend with:
- Authentication (register, login, get current user) using JWT
- Real-time chat using Socket.io — both a global room and private 1-to-1 messages

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your own `MONGO_URI` and `JWT_SECRET`.

Start MongoDB locally, or use a free MongoDB Atlas cluster and paste its connection string into `MONGO_URI`.

```bash
npm run dev     # with auto-restart (nodemon)
# or
npm start
```

Server runs at `http://localhost:5000` by default.

## REST API

### Register
```
POST /api/auth/register
Content-Type: application/json

{ "name": "Ali", "email": "ali@example.com", "password": "123456" }
```
Returns `{ user, token }`.

### Login
```
POST /api/auth/login
Content-Type: application/json

{ "email": "ali@example.com", "password": "123456" }
```
Returns `{ user, token }`.

### Get current user (protected)
```
GET /api/auth/me
Authorization: Bearer <token>
```

## Chat (Socket.io)

Connect with the JWT token you got from register/login:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "<the JWT token>" },
});

socket.on("connect", () => console.log("connected"));
socket.on("connect_error", (err) => console.log("connection rejected:", err.message));
```

### Global chat (everyone sees it)

```js
// Send
socket.emit("sendGlobalMessage", { text: "Hello everyone!" });

// Receive
socket.on("receiveGlobalMessage", (msg) => {
  console.log(msg.senderName, msg.text);
});
```

### Private chat (1-to-1)

```js
// Send — recipientId is the other user's Mongo _id
socket.emit("sendPrivateMessage", { recipientId: "6650...", text: "Hey!" });

// Receive
socket.on("receivePrivateMessage", (msg) => {
  console.log(msg.senderName, "->", msg.text);
});
```

### Online status

```js
socket.on("userOnline", (user) => console.log(user.name, "is online"));
socket.on("userOffline", (user) => console.log(user.name, "went offline"));
```

## Project structure

```
config/       MongoDB connection
models/       User and Message (Mongoose schemas)
middleware/   JWT auth guard for REST routes
controllers/  Route handler logic (register/login/getMe)
routes/       Express route definitions
sockets/      Socket.io connection + chat event handlers
utils/        JWT token helper
server.js     Entry point — wires Express + Socket.io together
```
