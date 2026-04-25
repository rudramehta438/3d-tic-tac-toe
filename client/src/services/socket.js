import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'https://threed-tic-tac-toe-uzni.onrender.com', {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true
});

export default socket;
