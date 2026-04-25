import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, register, loginGuest } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await register(username, password);
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    const handleGuest = () => {
        loginGuest();
        navigate('/');
    };

    return (
        <div className="auth-wrapper" style={{ perspective: '1200px', width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, rotateX: 45, rotateY: -15, z: -500, scale: 0.8 }}
                animate={{ opacity: 1, rotateX: 0, rotateY: 0, z: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                className="auth-container"
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
                <div className="glass-card auth-card" style={{ padding: '3.5rem' }}>
                    <motion.h1 
                        initial={{ z: 100, opacity: 0 }}
                        animate={{ z: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        style={{ textAlign: 'center', marginBottom: '3rem', fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: 'var(--primary)', textShadow: '0 0 30px var(--primary)' }}
                    >
                        ULTIMATE <span style={{ color: 'var(--secondary)', textShadow: '0 0 30px var(--secondary)' }}>X/O</span>
                    </motion.h1>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem', letterSpacing: '1px' }}>CODENAME</label>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                required 
                                placeholder="ENTER PILOT NAME..."
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem', letterSpacing: '1px' }}>ACCESS KEY</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--accent)', marginBottom: '1.5rem', textAlign: 'center', fontWeight: '800' }}>{error}</motion.p>}

                        <motion.button 
                            whileHover={{ scale: 1.05, translateZ: '20px' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ width: '100%', marginBottom: '1.5rem', fontSize: '1.2rem', height: '70px' }}
                        >
                            {isLogin ? <><LogIn size={20} /> INITIATE LINK</> : <><UserPlus size={20} /> CREATE PLAYER</>}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                        {isLogin ? "NEW PILOT? " : "REGISTERED PLAYER? "}
                        <span 
                            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '800', textDecoration: 'underline' }} 
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'REGISTER HERE' : 'LOG IN'}
                        </span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
                        <motion.button 
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)', translateZ: '10px' }}
                            onClick={handleGuest} 
                            className="btn btn-outline" 
                            style={{ width: '100%', fontSize: '1.1rem', height: '60px' }}
                        >
                            <User size={18} /> GUEST ACCESS: TRAIN
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
