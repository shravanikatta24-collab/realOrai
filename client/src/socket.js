import { io } from 'socket.io-client';

const socket = io('https://realorai-9ofc.onrender.com', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ['websocket', 'polling'],
});

export default socket;
