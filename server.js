const WebSocket = require('ws');

let globalWins = 0;

function createBoard(size, minesCount) {
    let board = Array(size).fill().map(() => Array(size).fill(0));
    let mines = 0;
    while (mines < minesCount) {
        let x = Math.floor(Math.random() * size);
        let y = Math.floor(Math.random() * size);
        if (board[x][y] !== 'M') {
            board[x][y] = 'M';
            mines++;
        }
    }
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (board[x][y] === 'M') continue;
            let count = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
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
    const size = board.length;
    if (x < 0 || x >= size || y < 0 || y >= size || revealed[x][y]) return;
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
    
    let size = 10;
    let minesCount = 15;
    let board = createBoard(size, minesCount);
    let revealed = Array(size).fill().map(() => Array(size).fill(false));
    let flagged = Array(size).fill().map(() => Array(size).fill(false));
    let gameOver = false;

    
    ws.once('message', function initHandler(message) {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }
        if (data.type === 'init') {
            if (typeof data.boardSize === 'number' && typeof data.mines === 'number') {
                size = Math.max(5, Math.min(20, data.boardSize));
                minesCount = Math.max(1, Math.min(size * size - 1, data.mines));
            }
            board = createBoard(size, minesCount);
            revealed = Array(size).fill().map(() => Array(size).fill(false));
            flagged = Array(size).fill().map(() => Array(size).fill(false));
            gameOver = false;
        }
        
        ws.send(JSON.stringify({
            type: 'init',
            boardSize: size,
            mines: minesCount,
            revealed,
            flagged,
            gameOver,
            globalWins
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
                        revealed,
                        globalWins
                    }));
                } else {
                    reveal(board, revealed, x, y);
                    
                    let safe = 0;
                    for (let i = 0; i < size; i++)
                        for (let j = 0; j < size; j++)
                            if (!revealed[i][j] && board[i][j] !== 'M') safe++;
                    if (safe === 0) {
                        gameOver = true;
                        globalWins++;
                        ws.send(JSON.stringify({
                            type: 'gameover',
                            result: 'win',
                            board,
                            revealed,
                            globalWins
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'update',
                            revealed,
                            globalWins
                        }));
                    }
                }
            } else if (data.type === 'flag') {
                const { x, y } = data;
                if (revealed[x][y]) return;
                flagged[x][y] = !flagged[x][y];
                ws.send(JSON.stringify({
                    type: 'update',
                    flagged,
                    globalWins
                }));
            }
        });
    });

    ws.on('close', function close() {
        
    });
});

const PORT = process.env.PORT || 8080;
console.log(`WebSocket Saper server is running on port ${PORT}`);