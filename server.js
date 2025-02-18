const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = {}; // Store room details

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === 'create' || data.type === 'join') {
            const { roomId, password } = data;

            if (data.type === 'create') {
                // Create new room
                rooms[roomId] = { password, clients: [ws] };
                ws.send(JSON.stringify({ type: 'room_created', roomId }));
            } else {
                // Join an existing room
                if (rooms[roomId] && rooms[roomId].password === password) {
                    rooms[roomId].clients.push(ws);
                    ws.send(JSON.stringify({ type: 'room_joined', roomId }));

                    // Notify others in the room
                    rooms[roomId].clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'new_peer', roomId }));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid Room ID or Password' }));
                }
            }
        } else {
            // Forward signaling messages (offer, answer, ICE candidates)
            if (rooms[data.roomId]) {
                rooms[data.roomId].clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Remove the disconnected client from all rooms
        Object.keys(rooms).forEach(roomId => {
            rooms[roomId].clients = rooms[roomId].clients.filter(client => client !== ws);
            if (rooms[roomId].clients.length === 0) delete rooms[roomId]; // Remove empty rooms
        });
    });
});

console.log('WebSocket server running on ws://localhost:8080');
