import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../services/socket';
import { Users, Monitor, Globe, LogOut, Plus, Trophy, History, Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [friendUsername, setFriendUsername] = useState('');
    const [error, setError] = useState('');
    const [invitations, setInvitations] = useState([]); // Game invites (socket)
    const [friendRequests, setFriendRequests] = useState([]); // Friend requests (API)
    const [successMessage, setSuccessMessage] = useState('');
    const [isSocialOpen, setIsSocialOpen] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (user && !user.isGuest) {
            fetchFriends();
            fetchRequests();
            socket.on('connect', () => {
                console.log('Connected to socket server');
                socket.emit('register_user', user.username);
            });
            
            socket.connect();
            
            // If already connected, register immediately
            if (socket.connected) {
                socket.emit('register_user', user.username);
            }

            socket.on('receive_invite', ({ from }) => {
                setInvitations(prev => {
                    const exists = prev.some(u => u.toLowerCase() === from.toLowerCase());
                    if (exists) return prev;
                    return [...prev, from];
                });
            });

            socket.on('receive_friend_request', () => {
                fetchRequests();
            });

            fetchLeaderboard();

            socket.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
                setError(`Connection Error: ${err.message}. Check if API URL is correct.`);
            });

            socket.on('error_message', ({ message }) => {
                setError(message);
                setTimeout(() => setError(''), 4000);
            });

            socket.on('game_start', ({ room, players, turn }) => {
                navigate(`/game/online?room=${room}&players=${players.join(',')}&turn=${turn}`);
            });
        }

        return () => {
            socket.off('receive_invite');
            socket.off('game_start');
            socket.off('error_message');
            socket.off('receive_friend_request');
        };
    }, [user]);

    const fetchFriends = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/friends`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setFriends(res.data);
        } catch (err) {
            console.error('Failed to fetch friends');
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/leaderboard`);
            setLeaderboard(res.data);
        } catch (err) {
            console.error('Failed to fetch leaderboard');
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/friends/requests`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setFriendRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch requests');
        }
    };

    const addFriend = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${API_URL}/api/friends/add`, 
                { friendUsername }, 
                { headers: { Authorization: `Bearer ${user.token}` }}
            );
            socket.emit('send_friend_request', { to: friendUsername, from: user.username });
            setFriendUsername('');
            setSuccessMessage(`Friend request sent to ${friendUsername}`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add friend');
        }
    };

    const handleInvite = (friendName) => {
        socket.emit('invite_friend', { invitedBy: user.username, friendName });
    };

    const acceptInvitation = (invitedBy) => {
        socket.emit('accept_invite', { acceptedBy: user.username, invitedBy });
        setInvitations(prev => prev.filter(name => name !== invitedBy));
    };

    const declineInvitation = (invitedBy) => {
        setInvitations(prev => prev.filter(name => name !== invitedBy));
    };

    const acceptFriendRequest = async (fromUsername) => {
        try {
            await axios.post(`${API_URL}/api/friends/accept-request`, 
                { fromUsername }, 
                { headers: { Authorization: `Bearer ${user.token}` }}
            );
            fetchRequests();
            fetchFriends();
        } catch (err) {
            console.error('Failed to accept request');
        }
    };

    const declineFriendRequest = async (fromUsername) => {
        try {
            await axios.post(`${API_URL}/api/friends/decline-request`, 
                { fromUsername }, 
                { headers: { Authorization: `Bearer ${user.token}` }}
            );
            fetchRequests();
        } catch (err) {
            console.error('Failed to decline request');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
    };

    const totalNotifications = invitations.length + friendRequests.length;

    return (
        <motion.div 
            className="dashboard-container" 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ maxWidth: '1000px', margin: '0 auto', perspective: '1200px' }}
        >
            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            {/* Main Content */}
            <motion.div 
                initial={{ rotateX: 20, opacity: 0, z: -200 }}
                animate={{ rotateX: 0, opacity: 1, z: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                <div className="glass-card" style={{ marginBottom: '2.5rem', padding: '3rem' }}>
                    <div className="dashboard-header">
                        <div>
                            <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', color: 'var(--primary)', textShadow: '0 0 20px var(--primary)' }}>PLAYER: {user?.username}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', letterSpacing: '2px', marginTop: '0.5rem' }}>COMMAND CENTER ONLINE</p>
                        </div>
                        <motion.button 
                            whileHover={{ scale: 1.05, x: 5, translateZ: 20 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={logout} 
                            className="btn btn-outline" 
                            style={{ border: 'none', background: 'rgba(255, 0, 85, 0.1)', color: 'var(--accent)', fontWeight: '800' }}
                        >
                            <LogOut size={18} /> ABORT SESSION
                        </motion.button>
                    </div>

                    <div className="stats-grid">
                        {[
                            { icon: Trophy, color: 'var(--primary)', value: user?.stats?.wins || 0, label: 'VICTORIES', bg: 'rgba(0, 242, 255, 0.03)' },
                            { icon: History, color: 'var(--accent)', value: user?.stats?.losses || 0, label: 'DEFEATS', bg: 'rgba(255, 0, 85, 0.03)' },
                            { icon: Globe, color: 'var(--secondary)', value: user?.stats?.totalGames || 0, label: 'BATTLES', bg: 'rgba(112, 0, 255, 0.03)' }
                        ].map((stat, idx) => (
                            <motion.div 
                                key={idx}
                                variants={itemVariants}
                                whileHover={{ y: -10, translateZ: 30, scale: 1.02 }}
                                className="glass-card" 
                                style={{ padding: '2rem', textAlign: 'center', background: stat.bg, borderColor: 'rgba(255,255,255,0.05)' }}
                            >
                                <stat.icon color={stat.color} size={32} style={{ marginBottom: '1rem', filter: `drop-shadow(0 0 10px ${stat.color})` }} />
                                <h3 style={{ fontSize: '3rem', color: stat.color, textShadow: `0 0 20px ${stat.color}` }}>{stat.value}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '2px' }}>{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="game-modes-grid">
                        <motion.button 
                            whileHover={{ scale: 1.02, translateZ: 40, boxShadow: '0 20px 40px rgba(0, 242, 255, 0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/game/local')} 
                            className="btn btn-primary" 
                            style={{ height: '90px', fontSize: '1.6rem' }}
                        >
                            <Users size={32} /> PVP: LOCAL ARENA
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.02, translateZ: 40, border: '1px solid var(--primary)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/game/computer')} 
                            className="btn btn-outline" 
                            style={{ height: '90px', fontSize: '1.6rem' }}
                        >
                            <Monitor size={32} /> PVE: NEURAL CORE
                        </motion.button>
                    </div>

                    {/* Global Leaderboard Section */}
                    <div style={{ marginTop: '4rem' }}>
                        <h2 style={{ color: 'var(--primary)', letterSpacing: '4px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Trophy size={24} /> GLOBAL RANKINGS
                        </h2>
                        <div style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: '24px', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            overflow: 'hidden'
                        }}>
                            {leaderboard.map((player, index) => (
                                <motion.div 
                                    key={player._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        padding: '1.2rem 2rem',
                                        borderBottom: index !== leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                        background: player.username === user.username ? 'rgba(0, 242, 255, 0.05)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ 
                                            color: index < 3 ? 'var(--primary)' : 'var(--text-muted)', 
                                            fontWeight: '900', 
                                            fontSize: '1.2rem',
                                            width: '30px'
                                        }}>
                                            #{index + 1}
                                        </span>
                                        <span style={{ fontWeight: '600', color: player.username === user.username ? 'var(--primary)' : 'white' }}>
                                            {player.username}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <span>WINS: <strong style={{ color: 'var(--primary)' }}>{player.stats.wins}</strong></span>
                                        <span>TOTAL: <strong>{player.stats.totalGames}</strong></span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Social Hub Symbolic Button (FAB) */}
            {!user?.isGuest && (
                <motion.button 
                    className="social-fab"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSocialOpen(true)}
                >
                    <Users size={32} />
                    {totalNotifications > 0 && (
                        <span style={{ 
                            position: 'absolute', top: '-5px', right: '-5px', 
                            background: 'var(--accent)', color: 'white', 
                            borderRadius: '50%', width: '24px', height: '24px', 
                            fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 0 10px var(--accent)', fontWeight: 'bold'
                        }}>
                            {totalNotifications}
                        </span>
                    )}
                </motion.button>
            )}

            {/* Social Drawer */}
            <AnimatePresence>
                {isSocialOpen && (
                    <>
                        <motion.div 
                            className="drawer-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSocialOpen(false)}
                        />
                        <motion.div 
                            className="social-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem' }}>SOCIAL HUB</h2>
                                <button onClick={() => setIsSocialOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                                {/* Challenges Section */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'var(--success)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Monitor size={18} /> CHALLENGES
                                    </h3>
                                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                                        {invitations.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>NO ACTIVE CHALLENGES.</p>}
                                        {invitations.map(from => (
                                            <motion.div key={from} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '1rem', borderColor: 'var(--success)' }}>
                                                <p style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}><strong>{from}</strong> challenged you!</p>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => acceptInvitation(from)} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: 'var(--success)' }}>BATTLE</button>
                                                    <button onClick={() => declineInvitation(from)} className="btn btn-outline" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>RETREAT</button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Alliance Requests Section */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Mail size={18} /> ALLIANCE REQS
                                    </h3>
                                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                                        {friendRequests.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>NO PENDING ALLIANCES.</p>}
                                        {friendRequests.map(from => (
                                            <motion.div key={from} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '1rem', borderColor: 'var(--primary)' }}>
                                                <p style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}><strong>{from}</strong> wants to ally!</p>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => acceptFriendRequest(from)} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>JOIN</button>
                                                    <button onClick={() => declineFriendRequest(from)} className="btn btn-outline" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>IGNORE</button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Friends Section */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'var(--secondary)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={18} /> SQUADRON
                                    </h3>
                                    <form onSubmit={addFriend} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <input 
                                            type="text" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)}
                                            placeholder="SYNC ID" className="form-group" style={{ padding: '0.5rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem' }}
                                        />
                                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}><Plus size={18} /></button>
                                    </form>
                                    {error && <p style={{ color: 'var(--accent)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>{error}</p>}
                                    {successMessage && <p style={{ color: 'var(--success)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>{successMessage}</p>}

                                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                                        {friends.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>NO ALLIES YET.</p>}
                                        {friends.map(friend => (
                                            <div key={friend.username} className="glass-card" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{friend.username}</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>W: {friend.stats.wins} L: {friend.stats.losses}</p>
                                                    </div>
                                                    <button onClick={() => handleInvite(friend.username)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>INVITE</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Dashboard;
