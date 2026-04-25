import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Verify token/get fresh stats
            if (parsedUser.token) {
                axios.get(`${API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${parsedUser.token}` }
                }).then(res => {
                    setUser({ ...parsedUser, stats: res.data.stats, friends: res.data.friends });
                }).catch(() => {
                    localStorage.removeItem('user');
                    setUser(null);
                });
            } else {
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        return res.data;
    };

    const register = async (username, password) => {
        const res = await axios.post(`${API_URL}/api/auth/register`, { username, password });
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        return res.data;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const loginGuest = () => {
        const guestUser = { username: 'Guest', isGuest: true, stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 } };
        setUser(guestUser);
    };

    const updateStatsLocally = (newStats) => {
        if (user) {
            setUser(prev => ({ ...prev, stats: newStats }));
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loginGuest, updateStatsLocally, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
