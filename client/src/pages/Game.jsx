import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '../services/socket';
import axios from 'axios';
import { ArrowLeft, RotateCcw, User, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Game = () => {
    const { mode } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, updateStatsLocally } = useAuth();

    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState(null);
    const [status, setStatus] = useState('');
    const [activeEmoji, setActiveEmoji] = useState({ X: null, O: null });

    const EMOJIS = ['😎', '😂', '🔥', '🤔', '💀', '🤡', '💪', '👋'];
    
    const room = searchParams.get('room');
    const players = searchParams.get('players')?.split(',');
    const mySymbol = players && players[0] === user?.username ? 'X' : 'O';

    // Sound Effects
    const sounds = {
        move: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
        win: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
        loss: new Audio('https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3'),
        emoji: new Audio('https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3')
    };

    const playSound = (name) => {
        const s = sounds[name];
        if (s) {
            s.currentTime = 0;
            s.play().catch(() => {}); // Catch browser blocking
        }
    };

    useEffect(() => {
        const calculateWinner = (squares) => {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (let line of lines) {
                const [a, b, c] = line;
                if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
            }
            if (!squares.includes(null)) return 'Draw';
            return null;
        };

        const win = calculateWinner(board);
        if (winner === 'Forfeit') return; 
        if (win) {
            setWinner(win);
            if (win === 'Draw') {
                setStatus("IT'S A DRAW!");
                if (mode !== 'local') recordResult('draw');
            } else if (win === 'Forfeit') {
                setStatus("VICTORY BY FORFEIT!");
                confetti({
                    particleCount: 200,
                    spread: 90,
                    origin: { y: 0.6 },
                    colors: ['#06b6d4', '#d946ef', '#10b981']
                });
                if (mode !== 'local') recordResult('win');
            } else {
                setStatus(`${win} VICTORIOUS!`);
                const iWon = (mode === 'online') ? (win === mySymbol) : (win === 'X');
                if (iWon) {
                    playSound('win');
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: [win === 'X' ? '#06b6d4' : '#d946ef', '#ffffff']
                    });
                } else {
                    playSound('loss');
                }
                if (mode !== 'local') recordResult(iWon ? 'win' : 'loss');
            }
        } else {
            setStatus(`${isXNext ? 'X' : 'O'}'S TURN`);
        }
    }, [board, isXNext, winner]);

    useEffect(() => {
        if (mode === 'online') {
            socket.connect();
            
            // Re-register and join room
            if (user) socket.emit('register_user', user.username);
            if (room) socket.emit('join_room', room);

            socket.on('move_made', ({ board: newBoard, nextTurn }) => {
                setBoard(newBoard);
                setIsXNext(nextTurn === 'X');
            });
            socket.on('rematch_started', ({ board: newBoard, nextTurn }) => {
                setBoard(newBoard);
                setIsXNext(nextTurn === 'X');
                setWinner(null);
                setStatus(`${nextTurn}'S TURN`);
            });
            
            socket.on('opponent_left', () => {
                setWinner('Forfeit');
                setStatus('MISSION ABORTED: VICTORY BY FORFEIT');
            });

            socket.on('receive_emoji', ({ emoji, sender }) => {
                const role = (sender.toLowerCase() === players[0].toLowerCase()) ? 'X' : 'O';
                setActiveEmoji(prev => ({ ...prev, [role]: emoji }));
                setTimeout(() => setActiveEmoji(prev => ({ ...prev, [role]: null })), 3000);
            });

            return () => {
                socket.off('move_made');
                socket.off('rematch_started');
                socket.off('opponent_left');
                socket.off('receive_emoji');
            };
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'computer' && !isXNext && !winner) {
            const timeout = setTimeout(() => {
                const bestMove = getBestMove(board);
                makeMove(bestMove);
            }, 600);
            return () => clearTimeout(timeout);
        }
    }, [isXNext, winner, mode]);

    const makeMove = (i) => {
        if (board[i] || winner) return;
        if (mode === 'online' && (isXNext ? 'X' : 'O') !== mySymbol) return;

        const newBoard = board.slice();
        newBoard[i] = isXNext ? 'X' : 'O';
        setBoard(newBoard);
        setIsXNext(!isXNext);
        playSound('move');

        if (mode === 'online') {
            socket.emit('make_move', { room, board: newBoard, nextTurn: !isXNext ? 'X' : 'O' });
        }
    };

    const recordResult = async (result) => {
        if (user?.isGuest) {
            const newStats = {
                ...user.stats,
                wins: user.stats.wins + (result === 'win' ? 1 : 0),
                losses: user.stats.losses + (result === 'loss' ? 1 : 0),
                draws: user.stats.draws + (result === 'draw' ? 1 : 0),
                totalGames: user.stats.totalGames + 1
            };
            updateStatsLocally(newStats);
            return;
        }
        try {
            const res = await axios.put(`${API_URL}/api/auth/stats`, 
                { wins: result === 'win' ? 1 : 0, losses: result === 'loss' ? 1 : 0, draws: result === 'draw' ? 1 : 0 },
                { headers: { Authorization: `Bearer ${user.token}` }}
            );
            updateStatsLocally(res.data);
        } catch (err) { console.error('Failed to update stats'); }
    };

    const sendEmoji = (emoji) => {
        playSound('emoji');
        if (mode === 'online') {
            socket.emit('send_emoji', { room, emoji, sender: user.username });
        } else {
            const role = isXNext ? 'X' : 'O';
            setActiveEmoji(prev => ({ ...prev, [role]: emoji }));
            setTimeout(() => setActiveEmoji(prev => ({ ...prev, [role]: null })), 3000);
        }
    };

    const resetGame = (emit = true) => {
        if (mode === 'online' && emit) {
            socket.emit('request_rematch', { room });
        } else {
            setBoard(Array(9).fill(null));
            setIsXNext(true);
            setWinner(null);
        }
    };

    const getBestMove = (currentBoard) => {
        const minimax = (tempBoard, depth, isMaximizing) => {
            const check = (sq) => {
                const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                for (let l of lines) if (sq[l[0]] && sq[l[0]] === sq[l[1]] && sq[l[0]] === sq[l[2]]) return sq[l[0]];
                return sq.includes(null) ? null : 'Draw';
            };
            const res = check(tempBoard);
            if (res === 'O') return 10 - depth;
            if (res === 'X') return depth - 10;
            if (res === 'Draw') return 0;
            if (isMaximizing) {
                let best = -Infinity;
                for (let i = 0; i < 9; i++) if (!tempBoard[i]) {
                    tempBoard[i] = 'O';
                    best = Math.max(best, minimax(tempBoard, depth + 1, false));
                    tempBoard[i] = null;
                }
                return best;
            } else {
                let best = Infinity;
                for (let i = 0; i < 9; i++) if (!tempBoard[i]) {
                    tempBoard[i] = 'X';
                    best = Math.min(best, minimax(tempBoard, depth + 1, true));
                    tempBoard[i] = null;
                }
                return best;
            }
        };
        let best = -Infinity, move = -1;
        for (let i = 0; i < 9; i++) if (!currentBoard[i]) {
            const temp = currentBoard.slice();
            temp[i] = 'O';
            let score = minimax(temp, 0, false);
            if (score > best) { best = score; move = i; }
        }
        return move;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            className="game-container"
            style={{ perspective: '1200px' }}
        >
            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
                <div className="dashboard-header" style={{ marginBottom: '3rem' }}>
                    <motion.button 
                        whileHover={{ x: -10, translateZ: 20 }}
                        onClick={() => {
                            if (mode === 'online') socket.emit('leave_game');
                            navigate('/');
                        }} 
                        className="btn btn-outline" 
                        style={{ color: 'var(--accent)', borderColor: 'rgba(255, 0, 85, 0.2)', fontWeight: '800' }}
                    >
                        <ArrowLeft size={18} /> ESCAPE
                    </motion.button>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ textTransform: 'uppercase', color: 'var(--primary)', textShadow: '0 0 20px var(--primary)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>{mode} ARENA</h2>
                        <motion.p 
                            key={status}
                            initial={{ y: -20, opacity: 0, z: 50 }}
                            animate={{ y: 0, opacity: 1, z: 0 }}
                            style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', marginTop: '0.5rem' }}
                        >
                            {status}
                        </motion.p>
                    </div>
                    <motion.button 
                        whileHover={{ rotate: 180, scale: 1.1, translateZ: 20 }}
                        onClick={() => resetGame()} 
                        className="btn btn-outline"
                    >
                        <RotateCcw size={18} />
                    </motion.button>
                </div>

                <div className="game-players" style={{ display: 'flex', justifyContent: 'center', gap: '5rem', marginBottom: '2.5rem' }}>
                    <motion.div style={{ position: 'relative' }} animate={{ opacity: (isXNext || winner === 'X') ? 1 : 0.2, scale: (isXNext && !winner) ? 1.2 : 1, z: (isXNext && !winner) ? 50 : 0 }}>
                        <AnimatePresence>
                            {activeEmoji.X && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20, scale: 0 }}
                                    animate={{ opacity: 1, y: -40, scale: 1.5 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '2rem', pointerEvents: 'none', zIndex: 100 }}
                                >
                                    {activeEmoji.X}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="square x" style={{ width: '80px', height: '80px', margin: '0 auto 0.8rem', cursor: 'default', fontSize: '2.5rem', background: 'rgba(0, 242, 255, 0.05)', borderRadius: '20px' }}>X</div>
                        <p style={{ fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px' }}>{mode === 'online' ? players[0] : 'PILOT ALPHA'}</p>
                    </motion.div>

                    <motion.div style={{ position: 'relative' }} animate={{ opacity: (!isXNext || winner === 'O') ? 1 : 0.2, scale: (!isXNext && !winner) ? 1.2 : 1, z: (!isXNext && !winner) ? 50 : 0 }}>
                        <AnimatePresence>
                            {activeEmoji.O && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20, scale: 0 }}
                                    animate={{ opacity: 1, y: -40, scale: 1.5 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '2rem', pointerEvents: 'none', zIndex: 100 }}
                                >
                                    {activeEmoji.O}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="square o" style={{ width: '80px', height: '80px', margin: '0 auto 0.8rem', cursor: 'default', fontSize: '2.5rem', background: 'rgba(112, 0, 255, 0.05)', borderRadius: '20px' }}>O</div>
                        <p style={{ fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px' }}>{mode === 'computer' ? 'NEURAL CORE' : (mode === 'online' ? players[1] : 'PILOT BETA')}</p>
                    </motion.div>
                </div>

                {/* Emoji Bar */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {EMOJIS.map(emoji => (
                        <motion.button
                            key={emoji}
                            whileHover={{ scale: 1.2, rotate: 10 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => sendEmoji(emoji)}
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '12px', 
                                padding: '0.5rem', 
                                fontSize: '1.5rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            {emoji}
                        </motion.button>
                    ))}
                </div>

                <div className="board">
                    {board.map((square, i) => (
                        <motion.div 
                            key={i} 
                            whileHover={!square && !winner ? { scale: 1.05, translateZ: 15, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                            whileTap={!square && !winner ? { scale: 0.95 } : {}}
                            className={`square ${square?.toLowerCase() || ''}`}
                            onClick={() => makeMove(i)}
                            style={{ position: 'relative' }}
                        >
                            <AnimatePresence>
                                {square && (
                                    <motion.span
                                        initial={{ scale: 0, opacity: 0, z: 100, rotateY: 180 }}
                                        animate={{ scale: 1, opacity: 1, z: 0, rotateY: 0 }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                    >
                                        {square}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                <AnimatePresence>
                    {winner && (
                        <motion.div 
                            initial={{ y: 50, opacity: 0, z: 100 }}
                            animate={{ y: 0, opacity: 1, z: 0 }}
                            style={{ marginTop: '3rem' }}
                        >
                            <button 
                                onClick={() => resetGame()} 
                                className="btn btn-primary" 
                                style={{ margin: '0 auto', padding: '1.5rem 4rem', width: '100%', maxWidth: '350px', fontSize: '1.4rem' }}
                            >
                                INITIATE REMATCH
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default Game;
