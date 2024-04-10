import express from 'express';
import { Server as WebSocketServer } from 'ws';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send("Hi! I'm glad you're excited to play, but the game's not ready yet sorry!");
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.on('message', message => {
        if (Buffer.isBuffer(message)) {
            console.log(message.toString())
        } else {
            console.log(message, typeof message);
        }
    })
    
    ws.send("Hi Unity, I'm Bun!");
});