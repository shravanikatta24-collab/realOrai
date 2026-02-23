import { io } from 'socket.io-client'; 
const socket = io('https://realorai-9ofc.onrender.com', { autoConnect: true, reconnection: true }); 
export default socket; 
