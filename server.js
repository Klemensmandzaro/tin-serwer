const WebSocket = require('ws');

const BOARD_SIZE = 10;
const MINES_COUNT = 15;

function createBoard() {
    let board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    let mines = 0;
    while (mines < MINES_COUNT) {
        let x = Math.floor(Math.random() * BOARD_SIZE);
        let y = Math.floor(Math.random() * BOARD_SIZE);
        if (board[x][y] !== 'M') {
            board[x][y] = 'M';
            mines++;
        }
    }
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            if (board[x][y] === 'M') continue;
            let count = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                        if (board[nx][ny] === 'M') count++;
                    }
                }
            }
            board[x][y] = count;
        }
    }
    return board;
}

function reveal(board, revealed, x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE || revealed[x][y]) return;
    revealed[x][y] = true;
    if (board[x][y] === 0) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) reveal(board, revealed, x + dx, y + dy);
            }
        }
    }
}

const wss = new WebSocket.Server({ 
    port: process.env.PORT || 8080,
    verifyClient: (info, callback) => {
        callback(true);
    }
});

wss.on('connection', function connection(ws) {
    // Stan gry dla tego klienta
    let board = createBoard();
    let revealed = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    let flagged = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    let gameOver = false;

    // Wyślij początkowy stan gry
    ws.send(JSON.stringify({
        type: 'init',
        boardSize: BOARD_SIZE,
        mines: MINES_COUNT,
        revealed,
        flagged,
        gameOver
    }));

    ws.on('message', function incoming(message) {
        if (gameOver) return;
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        if (data.type === 'reveal') {
            const { x, y } = data;
            if (flagged[x][y] || revealed[x][y]) return;
            if (board[x][y] === 'M') {
                revealed[x][y] = true;
                gameOver = true;
                ws.send(JSON.stringify({
                    type: 'gameover',
                    result: 'lose',
                    board,
                    revealed
                }));
            } else {
                reveal(board, revealed, x, y);
                // Sprawdź wygraną
                let safe = 0;
                for (let i = 0; i < BOARD_SIZE; i++)
                    for (let j = 0; j < BOARD_SIZE; j++)
                        if (!revealed[i][j] && board[i][j] !== 'M') safe++;
                if (safe === 0) {
                    gameOver = true;
                    ws.send(JSON.stringify({
                        type: 'gameover',
                        result: 'win',
                        board,
                        revealed
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'update',
                        revealed
                    }));
                }
            }
        } else if (data.type === 'flag') {
            const { x, y } = data;
            if (revealed[x][y]) return;
            flagged[x][y] = !flagged[x][y];
            ws.send(JSON.stringify({
                type: 'update',
                flagged
            }));
        }
    });

    ws.on('close', function close() {
        // Możesz dodać logikę czyszczenia, jeśli chcesz
    });
});

const PORT = process.env.PORT || 8080;
console.log(`WebSocket Saper server is running on port ${PORT}`);