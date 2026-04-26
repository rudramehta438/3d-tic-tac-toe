import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, login, register, loginGuest } = useAuth();

    React.useEffect(() => {
        // Self-Cleaning: Clear any old, malformed session data
        try {
            const stored = localStorage.getItem('user');
            if (stored && !JSON.parse(stored)?.token) {
                localStorage.removeItem('user');
            }
        } catch (e) {
            localStorage.removeItem('user');
        }

        if (user) navigate('/');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) await login(username, password);
            else await register(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    return (
        <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="nebula-bg" />
            <div className="grid-overlay" />

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="glass-panel"
                style={{ width: '100%', maxWidth: '450px', padding: '3rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{ display: 'inline-block', marginBottom: '1rem' }}
                    >
                        <Sparkles size={40} color="var(--primary)" />
                    </motion.div>
                    <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '2px' }}>
                        SECURE NEURAL LINK INITIATED
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group" style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                        <input
                            type="text"
                            placeholder="OPERATOR ID"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{ 
                                width: '100%', padding: '1.2rem 1.2rem 1.2rem 3.5rem', 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                borderRadius: '15px', color: 'white', outline: 'none', transition: '0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                        />
                    </div>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                        <input
                            type="password"
                            placeholder="ACCESS CODE"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ 
                                width: '100%', padding: '1.2rem 1.2rem 1.2rem 3.5rem', 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                borderRadius: '15px', color: 'white', outline: 'none', transition: '0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center', fontWeight: '700' }}
                            >
                                ERROR: {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1.2rem' }}
                    >
                        {isLogin ? 'AUTHENTICATE' : 'INITIALIZE'} <ArrowRight size={18} />
                    </motion.button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    >
                        {isLogin ? "NEW OPERATOR? REGISTER" : "ALREADY REGISTERED? LOGIN"}
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--glass-border)' }}>
                        <div style={{ flex: 1, height: '1px', background: 'currentColor' }} />
                        <span style={{ fontSize: '0.7rem' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: 'currentColor' }} />
                    </div>

                    <button 
                        onClick={() => { loginGuest(); navigate('/'); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px' }}
                    >
                        CONTINUE AS GUEST
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
