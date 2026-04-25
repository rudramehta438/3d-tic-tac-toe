const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const friendRoutes = require('./routes/friendRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);

// Socket.io logic
const users = new Map(); // username -> socketId
const games = new Map(); // room -> { board, nextTurn, players }
const socketToRoom = new Map(); // socketId -> room

io.on('connection', (socket) => {
    console.log('--- NEW CONNECTION ---', socket.id);

    socket.on('register_user', (username) => {
        const normalizedUsername = username.toLowerCase();
        users.set(normalizedUsername, socket.id);
        socket.username = normalizedUsername;
        console.log(`User Registered: ${normalizedUsername} -> ${socket.id}`);
    });

    socket.on('invite_friend', ({ invitedBy, friendName }) => {
        const normalizedFriendName = friendName.toLowerCase();
        const friendSocketId = users.get(normalizedFriendName);
        if (friendSocketId) {
            io.to(friendSocketId).emit('receive_invite', { from: invitedBy });
        } else {
            socket.emit('error_message', { message: 'Friend is not online' });
        }
    });

    socket.on('accept_invite', ({ acceptedBy, invitedBy }) => {
        const normalizedAcceptedBy = acceptedBy.toLowerCase();
        const normalizedInvitedBy = invitedBy.toLowerCase();
        const inviterSocketId = users.get(normalizedInvitedBy);
        
        if (inviterSocketId) {
            const room = `room_${normalizedInvitedBy}_${normalizedAcceptedBy}`;
            console.log(`Room Created: ${room}`);
            
            socket.join(room);
            socketToRoom.set(socket.id, room);
            
            const inviterSocket = io.sockets.sockets.get(inviterSocketId);
            if (inviterSocket) {
                inviterSocket.join(room);
                socketToRoom.set(inviterSocketId, room);
            }
            
            const gameState = { board: Array(9).fill(null), nextTurn: 'X', players: [normalizedInvitedBy, normalizedAcceptedBy] };
            games.set(room, gameState);
            io.to(room).emit('game_start', { room, players: gameState.players, turn: gameState.nextTurn });
        }
    });

    socket.on('join_room', (room) => {
        socket.join(room);
        socketToRoom.set(socket.id, room);
        console.log(`Socket ${socket.id} joined room ${room}. Current map size: ${socketToRoom.size}`);
        
        const game = games.get(room);
        if (game) {
            socket.emit('move_made', { board: game.board, nextTurn: game.nextTurn });
        }
    });

    socket.on('make_move', ({ room, board, nextTurn }) => {
        const game = games.get(room);
        if (game) {
            game.board = board;
            game.nextTurn = nextTurn;
            socket.to(room).emit('move_made', { board, nextTurn });
        }
    });

    const handleForfeit = (socketId) => {
        const room = socketToRoom.get(socketId);
        console.log(`Handling Forfeit for ${socketId}. Room found: ${room}`);
        if (room && games.has(room)) {
            console.log(`EMITTING OPPONENT_LEFT to room: ${room}`);
            io.to(room).emit('opponent_left');
            games.delete(room);
            // Cleanup
            for (let [sId, rId] of socketToRoom.entries()) {
                if (rId === room) socketToRoom.delete(sId);
            }
        }
    };

    socket.on('leave_game', () => {
        console.log(`Manual Leave: ${socket.id}`);
        handleForfeit(socket.id);
    });

    socket.on('disconnect', () => {
        console.log(`--- DISCONNECT --- ${socket.id} (${socket.username})`);
        handleForfeit(socket.id);
        if (socket.username) users.delete(socket.username);
    });
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tictactoe';

mongoose.connect(MONGO_URI)
    .then(() => {
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error(err));
