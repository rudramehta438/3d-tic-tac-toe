import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '../services/socket';
import axios from 'axios';
import { ArrowLeft, RotateCcw, Trophy, User, MessageSquare } from 'lucide-react';
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
    
    // Identity Check: Make sure we know which player we are!
    const mySymbol = (players && user && players[0].toLowerCase() === user.username.toLowerCase()) ? 'X' : 'O';

    const sounds = {
        move: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
        win: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
        loss: new Audio('https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3'),
        emoji: new Audio('https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3')
    };

    const playSound = (name) => {
        const s = sounds[name];
        if (s) { s.currentTime = 0; s.play().catch(() => {}); }
    };

    useEffect(() => {
        const checkWinner = (sq) => {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (let [a, b, c] of lines) if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a];
            return sq.includes(null) ? null : 'Draw';
        };

        const win = checkWinner(board);
        if (winner === 'Forfeit') return;
        if (win) {
            setWinner(win);
            if (win === 'Draw') {
                setStatus("NEURAL STALEMATE");
                if (mode !== 'local') recordResult('draw');
            } else {
                setStatus(`${win} DOMINATED`);
                const iWon = (mode === 'online') ? (win === mySymbol) : (win === 'X');
                if (iWon) {
                    playSound('win');
                    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
                    if (mode !== 'local') recordResult('win');
                } else {
                    playSound('loss');
                    if (mode !== 'local') recordResult('loss');
                }
            }
        } else {
            setStatus(`${isXNext ? 'X' : 'O'}'S CALCULATION`);
        }
    }, [board, isXNext]);

    useEffect(() => {
        if (mode === 'online' && room) {
            if (!socket.connected) socket.connect();
            
            socket.emit('register_user', user?.username || 'unknown');
            socket.emit('join_room', room);

            socket.on('move_made', ({ board, nextTurn }) => {
                setBoard(board);
                setIsXNext(nextTurn === 'X');
                playSound('move');
            });
            socket.on('rematch_started', ({ board: b, nextTurn }) => {
                setBoard(b); setIsXNext(nextTurn === 'X'); setWinner(null);
            });
            socket.on('receive_emoji', ({ emoji, sender }) => {
                const role = (sender === (players?.[0] || '')) ? 'X' : 'O';
                setActiveEmoji(p => ({ ...p, [role]: emoji }));
                setTimeout(() => setActiveEmoji(p => ({ ...p, [role]: null })), 3000);
            });
            socket.on('opponent_left', () => { setWinner('Forfeit'); setStatus('OPPONENT ABORTED'); });

            return () => {
                socket.off('move_made'); socket.off('rematch_started');
                socket.off('receive_emoji'); socket.off('opponent_left');
            };
        }
    }, [mode, room, user, players]);

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
        
        // Only allow move if it's your turn!
        const currentTurn = isXNext ? 'X' : 'O';
        if (mode === 'online' && currentTurn !== mySymbol) {
            console.log("NOT YOUR TURN! You are:", mySymbol, "Wait for:", currentTurn);
            return;
        }

        const newBoard = [...board];
        const symbol = currentTurn;
        newBoard[i] = symbol;
        setBoard(newBoard);
        setIsXNext(!isXNext);
        playSound('move');

        if (mode === 'online') {
            socket.emit('make_move', { room, board: newBoard, nextTurn: !isXNext ? 'X' : 'O' });
        }
    };

    const recordResult = async (res) => {
        try {
            await axios.put(`${API_URL}/api/auth/stats`, { result: res }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (err) { console.error('Stats sync failed'); }
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
                for (let i = 0; i < 9; i++) {
                    if (!tempBoard[i]) {
                        tempBoard[i] = 'O';
                        best = Math.max(best, minimax(tempBoard, depth + 1, false));
                        tempBoard[i] = null;
                    }
                }
                return best;
            } else {
                let best = Infinity;
                for (let i = 0; i < 9; i++) {
                    if (!tempBoard[i]) {
                        tempBoard[i] = 'X';
                        best = Math.min(best, minimax(tempBoard, depth + 1, true));
                        tempBoard[i] = null;
                    }
                }
                return best;
            }
        };

        let bestVal = -Infinity;
        let move = -1;
        const temp = [...currentBoard];
        for (let i = 0; i < 9; i++) {
            if (!temp[i]) {
                temp[i] = 'O';
                let moveVal = minimax(temp, 0, false);
                temp[i] = null;
                if (moveVal > bestVal) {
                    bestVal = moveVal;
                    move = i;
                }
            }
        }
        return move;
    };

    const resetGame = (emit = true) => {
        if (mode === 'online' && emit) {
            socket.emit('request_rematch', { room });
        } else {
            setBoard(Array(9).fill(null)); setIsXNext(true); setWinner(null);
        }
    };

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="nebula-bg" />
            <div className="grid-overlay" />

            <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <motion.button whileHover={{ x: -5 }} onClick={() => navigate('/')} className="btn btn-outline" style={{ padding: '0.8rem' }}><ArrowLeft size={18} /></motion.button>
                <div style={{ textAlign: 'center' }}>
                    <h2 className="gradient-text" style={{ fontSize: '1rem', letterSpacing: '5px' }}>{mode.toUpperCase()} ARENA</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '900', marginTop: '0.5rem' }}>{status}</p>
                </div>
                <motion.button whileHover={{ rotate: 180 }} onClick={() => resetGame()} className="btn btn-outline" style={{ padding: '0.8rem' }}><RotateCcw size={18} /></motion.button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }} className="battle-layout">
                <div style={{ textAlign: 'center', position: 'relative', minWidth: '120px' }}>
                    <AnimatePresence>{activeEmoji.X && <motion.div initial={{ scale: 0, y: 0 }} animate={{ scale: 2, y: -50 }} exit={{ scale: 0 }} style={{ position: 'absolute', width: '100%', top: 0, zIndex: 100 }}>{activeEmoji.X}</motion.div>}</AnimatePresence>
                    <div className={`game-square ${isXNext ? 'x' : ''}`} style={{ width: '80px', height: '80px', margin: '0 auto', opacity: isXNext ? 1 : 0.2 }}>X</div>
                    <p style={{ marginTop: '1rem', fontWeight: '900', letterSpacing: '2px', fontSize: '0.7rem', color: isXNext ? 'var(--primary)' : 'var(--text-muted)' }}>{mode === 'online' ? players?.[0] : 'ALPHA'}</p>
                </div>

                <div className="game-board-container" style={{ flex: '1', maxWidth: '450px' }}>
                    {board.map((sq, i) => (
                        <motion.div key={i} whileTap={{ scale: 0.9 }} className={`game-square ${sq?.toLowerCase() || ''} ${sq ? 'occupied' : ''}`} onClick={() => makeMove(i)}>
                            {sq}
                        </motion.div>
                    ))}
                </div>

                <div style={{ textAlign: 'center', position: 'relative', minWidth: '120px' }}>
                    <AnimatePresence>{activeEmoji.O && <motion.div initial={{ scale: 0, y: 0 }} animate={{ scale: 2, y: -50 }} exit={{ scale: 0 }} style={{ position: 'absolute', width: '100%', top: 0, zIndex: 100 }}>{activeEmoji.O}</motion.div>}</AnimatePresence>
                    <div className={`game-square ${!isXNext ? 'o' : ''}`} style={{ width: '80px', height: '80px', margin: '0 auto', opacity: !isXNext ? 1 : 0.2 }}>O</div>
                    <p style={{ marginTop: '1rem', fontWeight: '900', letterSpacing: '2px', fontSize: '0.7rem', color: !isXNext ? 'var(--secondary)' : 'var(--text-muted)' }}>{mode === 'computer' ? 'NEURAL' : (mode === 'online' ? players?.[1] : 'BETA')}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '3rem' }}>
                {EMOJIS.map(e => <motion.button key={e} whileHover={{ y: -5 }} onClick={() => { playSound('emoji'); socket.emit('send_emoji', { room, emoji: e, sender: user.username }); }} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', fontSize: '1.2rem' }}>{e}</motion.button>)}
            </div>

            <AnimatePresence>
                {winner && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                            <h2 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '2rem' }}>{status}</h2>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => resetGame(true)} className="btn btn-primary">RE-INITIATE</button>
                                <button onClick={() => navigate('/')} className="btn btn-outline">ABORT</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Game;
