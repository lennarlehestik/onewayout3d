const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname)));

const players = new Map();

wss.on('connection', (ws) => {
    const playerId = Date.now().toString();
    players.set(playerId, ws);

    console.log(`Player ${playerId} connected`);

    // Send initial player ID
    ws.send(JSON.stringify({ type: 'init', id: playerId }));

    // Notify about existing players
    players.forEach((_, id) => {
        if (id !== playerId) {
            ws.send(JSON.stringify({ type: 'playerJoined', id: id }));
        }
    });

    // Notify other players about the new player
    broadcast({ type: 'playerJoined', id: playerId }, playerId);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        data.id = playerId;
        console.log(`Received message from ${playerId}:`, data);

        switch(data.type) {
            case 'move':
                // Broadcast player movement to all other players
                broadcast(data, playerId);
                break;
            case 'shoot':
                // Broadcast shooting information to all players, including the shooter
                broadcast(data);
                break;
            default:
                console.log(`Unknown message type: ${data.type}`);
        }
    });

    ws.on('close', () => {
        console.log(`Player ${playerId} disconnected`);
        players.delete(playerId);
        broadcast({ type: 'playerLeft', id: playerId });
    });
});

function broadcast(data, excludeId = null) {
    players.forEach((client, id) => {
        if (id !== excludeId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});