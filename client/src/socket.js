import { io } from 'socket.io-client';

const socket = io('https://realorai-9ofc.onrender.com', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
});

export default socket;
```

**Step 4.** Save the file (Ctrl + S)

**Step 5.** Go to Command Prompt and run:
```
cd "C:\Users\Yashas Katta\Desktop\realOrai-game"
```
```
git add .
git commit -m "fix socket url"
git push