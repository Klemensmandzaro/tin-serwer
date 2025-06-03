const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ 
    port: process.env.PORT || 8080,
    // Allow connections from any origin
    verifyClient: (info, callback) => {
        console.log('New connection attempt from:', info.origin);
        callback(true);
    }
});

// Add error handling for the server
wss.on('error', function(error) {
    console.error('WebSocket Server Error:', error);
});

// Connection event handler
wss.on('connection', function connection(ws, req) {
    const clientIP = req.socket.remoteAddress;
    console.log('New client connected from:', clientIP);
    console.log('Request headers:', req.headers);
    
    // Send "cześć" message to the client
    try {
        console.log('Attempting to send "cześć" message...');
        ws.send('cześć', (error) => {
            if (error) {
                console.error('Error sending message:', error);
            } else {
                console.log('Successfully sent "cześć" message');
            }
        });
    } catch (error) {
        console.error('Error in send attempt:', error);
    }

    // Handle messages from client
    ws.on('message', function incoming(message) {
        console.log('Received message from', clientIP, ':', message.toString());
    });

    // Handle client disconnection
    ws.on('close', function close(code, reason) {
        console.log('Client disconnected:', clientIP, 'Code:', code, 'Reason:', reason);
    });

    // Handle errors for this connection
    ws.on('error', function(error) {
        console.error('WebSocket Connection Error for', clientIP, ':', error);
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
console.log(`WebSocket server is running on port ${PORT}`);
console.log('Waiting for connections...'); 