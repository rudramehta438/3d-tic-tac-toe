import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Monitor, Trophy, LogOut, MessageSquare, Plus, Bell, Crown, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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

            return () => {
                socket.off('receive_invite');
                socket.off('receive_friend_request');
            };
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [friendsRes, requestsRes, leaderboardRes] = await Promise.all([
                axios.get(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
                axios.get(`${API_URL}/api/friends/requests`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
                axios.get(`${API_URL}/api/auth/leaderboard`)
            ]);
            setFriends(friendsRes.data);
            setFriendRequests(requestsRes.data);
            setLeaderboard(leaderboardRes.data);
        } catch (err) { console.error('Data fetch failed'); }
    };

    const sendFriendRequest = async () => {
        try {
            await axios.post(`${API_URL}/api/friends/request`, { friendUsername: friendName }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFriendName('');
            fetchData();
        } catch (err) { setError(err.response?.data?.message || 'Failed to send request'); }
    };

    const handleInvite = (friend) => {
        socket.emit('invite_friend', { invitedBy: user.username, friendName: friend });
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>OPERATOR: {user?.username?.toUpperCase()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <motion.button 
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setIsSocialOpen(true)}
                        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '15px', color: 'white', position: 'relative' }}
                    >
                        <Users size={20} />
                        {friendRequests.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent)', width: '15px', height: '15px', borderRadius: '50%', fontSize: '10px' }}>{friendRequests.length}</span>}
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,0,85,0.1)' }} whileTap={{ scale: 0.9 }}
                        onClick={logout}
                        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '15px', color: 'var(--accent)' }}
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
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(5px)' }}
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '100%', maxWidth: '400px', background: 'var(--bg-dark)', zIndex: 1001, padding: '3rem', borderLeft: '1px solid var(--glass-border)' }}
                        >
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                SOCIAL HUB <button onClick={() => setIsSocialOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>✕</button>
                            </h2>

                            {/* Friend Search */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                                <input 
                                    type="text" placeholder="FIND OPERATOR..." value={friendName}
                                    onChange={(e) => setFriendName(e.target.value)}
                                    style={{ flex: 1, padding: '0.8rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                                />
                                <motion.button whileTap={{ scale: 0.9 }} onClick={sendFriendRequest} style={{ padding: '0.8rem', background: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'black' }}><Plus size={20}/></motion.button>
                            </div>

                            {/* Active Invites */}
                            {invitations.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <p style={{ color: 'var(--accent)', fontSize: '0.7rem', marginBottom: '1rem' }}>INCOMING CHALLENGES</p>
                                    {invitations.map((inviter, i) => (
                                        <motion.div key={i} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{inviter}</span>
                                            <button onClick={() => navigate(`/game/online?room=room_${inviter}_${user.username}&players=${inviter},${user.username}&turn=X`)} style={{ background: 'var(--success)', border: 'none', borderRadius: '5px', padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}>ACCEPT</button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Squad List */}
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '1rem' }}>ACTIVE SQUAD</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {friends.map((friend, i) => (
                                    <div key={i} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 10px var(--success)' }} />
                                            <span style={{ fontSize: '0.9rem' }}>{friend.username}</span>
                                        </div>
                                        <button onClick={() => handleInvite(friend.username)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '5px', fontSize: '0.7rem' }}>CHALLENGE</button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
