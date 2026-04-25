import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Monitor, Trophy, LogOut, Plus, Crown, X, Check, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://threed-tic-tac-toe-uzni.onrender.com';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isSocialOpen, setIsSocialOpen] = useState(false);
    const [invitations, setInvitations] = useState([]);
    const [friendName, setFriendName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && !user.isGuest) {
            fetchData();
            socket.connect();
            socket.emit('register_user', user.username);

            socket.on('receive_invite', ({ from }) => {
                setInvitations(prev => [...new Set([...prev, from])]);
            });

            socket.on('receive_friend_request', fetchData);

            socket.on('game_start', ({ room, players, turn }) => {
                navigate(`/game/online?room=${room}&players=${players.join(',')}&turn=${turn}`);
            });

            return () => {
                socket.off('receive_invite');
                socket.off('receive_friend_request');
                socket.off('game_start');
            };
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const token = storedUser?.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const [friendsRes, requestsRes, leaderboardRes] = await Promise.all([
                axios.get(`${API_URL}/api/friends`, config),
                axios.get(`${API_URL}/api/friends/requests`, config),
                axios.get(`${API_URL}/api/auth/leaderboard`)
            ]);
            setFriends(friendsRes.data);
            setFriendRequests(requestsRes.data);
            setLeaderboard(leaderboardRes.data);
        } catch (err) { console.error('Data fetch failed'); }
    };

    const sendFriendRequest = async () => {
        if (!friendName) return;
        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const token = storedUser?.token;
            await axios.post(`${API_URL}/api/friends/add`, { friendUsername: friendName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriendName('');
            setError('REQUEST SENT!');
            setTimeout(() => setError(''), 3000);
            fetchData();
        } catch (err) { setError(err.response?.data?.message || 'Failed to send'); }
    };

    const acceptRequest = async (username) => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const token = storedUser?.token;
            await axios.post(`${API_URL}/api/friends/accept-request`, { fromUsername: username }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) { console.error('Accept failed'); }
    };

    const handleInvite = (friend) => {
        socket.emit('invite_friend', { invitedBy: user.username, friendName: friend });
        setError(`CHALLENGE SENT TO ${friend}!`);
        setTimeout(() => setError(''), 3000);
    };

    return (
        <div style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="nebula-bg" />
            <div className="grid-overlay" />

            {/* Header */}
            <motion.header 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}
            >
                <div>
                    <h2 className="gradient-text" style={{ fontSize: '1.2rem', letterSpacing: '4px' }}>COMMAND CENTER</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '900' }}>OPERATOR: {user?.username?.toUpperCase()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <motion.button 
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setIsSocialOpen(true)}
                        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '15px', color: 'white', cursor: 'pointer', position: 'relative' }}
                    >
                        <Users size={20} />
                        {(friendRequests.length + invitations.length) > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent)', width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>{friendRequests.length + invitations.length}</span>}
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,0,85,0.1)' }} whileTap={{ scale: 0.9 }}
                        onClick={logout}
                        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '15px', color: 'var(--accent)', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                    </motion.button>
                </div>
            </motion.header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }} className="dashboard-main">
                {/* Left Side: Game Modes & Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { label: 'WINS', value: user?.stats?.wins || 0, color: 'var(--primary)', icon: Crown },
                            { label: 'LOSSES', value: user?.stats?.losses || 0, color: 'var(--accent)', icon: Trophy },
                            { label: 'RATIO', value: user?.stats?.totalGames > 0 ? ((user.stats.wins / user.stats.totalGames) * 100).toFixed(0) + '%' : '0%', color: 'var(--secondary)', icon: Monitor }
                        ].map((stat, i) => (
                            <motion.div 
                                key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}
                            >
                                <stat.icon size={20} color={stat.color} style={{ marginBottom: '0.5rem' }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '2px' }}>{stat.label}</p>
                                <h3 style={{ fontSize: '2rem', color: stat.color }}>{stat.value}</h3>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="game-modes-grid">
                        <motion.div 
                            whileHover={{ y: -10 }} className="glass-panel" 
                            style={{ padding: '3rem', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--primary)' }}
                            onClick={() => navigate('/game/local')}
                        >
                            <Users size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                            <h3 style={{ color: 'var(--primary)' }}>LOCAL PVP</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>BATTLE ON THE SAME DEVICE</p>
                        </motion.div>
                        <motion.div 
                            whileHover={{ y: -10 }} className="glass-panel" 
                            style={{ padding: '3rem', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--secondary)' }}
                            onClick={() => navigate('/game/computer')}
                        >
                            <Monitor size={48} color="var(--secondary)" style={{ marginBottom: '1.5rem' }} />
                            <h3 style={{ color: 'var(--secondary)' }}>NEURAL CORE</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>CHALLENGE THE AI SYSTEM</p>
                        </motion.div>
                    </div>
                </div>

                {/* Right Side: Leaderboard */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="glass-panel" style={{ padding: '2rem' }}
                >
                    <h3 style={{ fontSize: '1rem', marginBottom: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Trophy size={18} /> THE ELITE THREE
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {leaderboard.map((player, i) => (
                            <div key={i} style={{ 
                                display: 'flex', justifyContent: 'space-between', padding: '1rem', 
                                background: 'rgba(255,255,255,0.02)', borderRadius: '15px',
                                border: player.username === user?.username ? '1px solid var(--primary)' : '1px solid transparent'
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ color: i === 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '900' }}>#{i+1}</span>
                                    <span style={{ fontSize: '0.9rem' }}>{player.username}</span>
                                </div>
                                <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{player.stats.wins}W</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Social Drawer */}
            <AnimatePresence>
                {isSocialOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsSocialOpen(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(3px)' }}
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '100%', maxWidth: '420px', background: 'var(--bg-dark)', zIndex: 1001, padding: '2.5rem', borderLeft: '1px solid var(--glass-border)', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1rem', letterSpacing: '2px' }}>SOCIAL HUB</h2>
                                <button onClick={() => setIsSocialOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}><X size={24}/></button>
                            </div>

                            {/* Section 1: Find Operators */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '1rem', letterSpacing: '2px' }}>FIND OPERATORS</p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input 
                                            type="text" placeholder="ENTER USERNAME..." value={friendName}
                                            onChange={(e) => setFriendName(e.target.value)}
                                            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '15px', color: 'white' }}
                                        />
                                    </div>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={sendFriendRequest} style={{ width: '50px', background: 'var(--primary)', border: 'none', borderRadius: '15px', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={24}/></motion.button>
                                </div>
                                {error && <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: '700' }}>{error}</p>}
                            </div>

                            {/* Section 2: Incoming Requests */}
                            {(friendRequests.length > 0 || invitations.length > 0) && (
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <p style={{ color: 'var(--accent)', fontSize: '0.7rem', marginBottom: '1rem', letterSpacing: '2px' }}>PENDING ACTIONS</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {invitations.map((inviter, i) => (
                                            <div key={`inv-${i}`} className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--success)', background: 'rgba(0,255,170,0.05)' }}>
                                                <p style={{ fontSize: '0.8rem', marginBottom: '0.8rem' }}>GAME CHALLENGE: <b>{inviter}</b></p>
                                                <button onClick={() => navigate(`/game/online?room=room_${inviter}_${user.username}&players=${inviter},${user.username}&turn=X`)} style={{ width: '100%', background: 'var(--success)', border: 'none', borderRadius: '8px', padding: '0.6rem', color: 'black', fontWeight: '800', cursor: 'pointer' }}>ACCEPT & PLAY</button>
                                            </div>
                                        ))}
                                        {friendRequests.map((req, i) => (
                                            <div key={`req-${i}`} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.9rem' }}>{req.username} wants to join squad</span>
                                                <button onClick={() => acceptRequest(req.username)} style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', padding: '0.5rem', color: 'black', cursor: 'pointer' }}><Check size={18}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 3: Squad List */}
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '1rem', letterSpacing: '2px' }}>ACTIVE SQUAD</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {friends.length > 0 ? (
                                        friends.map((f, i) => {
                                            const fName = f.username || f.friend?.username;
                                            if (!fName) return null;
                                            return (
                                                <div key={i} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 10px var(--success)' }} />
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fName}</span>
                                                    </div>
                                                    <button onClick={() => handleInvite(fName)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>CHALLENGE</button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--glass-border)', borderRadius: '24px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>SQUAD IS EMPTY</p>
                                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', marginTop: '0.5rem' }}>ADD OPERATORS ABOVE TO START BATTLING</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
