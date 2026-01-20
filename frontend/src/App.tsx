import { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import ChatLayout from './components/ChatLayout';

export default function App() {
    const [wallet, setWallet] = useState<string | null>(localStorage.getItem('wallet'));
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [walletId, setWalletId] = useState<string | null>(localStorage.getItem('walletId'));

    // Automatic Dark Mode Handler
    // Automatic Dark Mode Handler (with Manual Override)
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');

        if (storedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (storedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System Fallback
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, []);

    function handleLogout() {
        setWallet(null);
        setToken(null);
        setWalletId(null);
        localStorage.removeItem('wallet');
        localStorage.removeItem('token');
        localStorage.removeItem('walletId');
        delete axios.defaults.headers.common['Authorization'];
        // Optional: clear private keys if you want strict security
        // localStorage.removeItem('privKeyBase64'); 
    }

    // Validate Session on Mount / Change
    useEffect(() => {
        if (wallet && token) {
            // Set global auth header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Verify session validity by making a quick read request
            const API_URL = import.meta.env.VITE_API_URL || '';
            axios.get(`${API_URL}/user/${wallet}/conversations`)
                .catch((err) => {
                    console.error("Session verification failed:", err);
                    // If 401/403, logout. For now, assuming any error means bad session might be too aggressive,
                    // but usually safe for "conversations" endpoint. 
                    // Let's check status explicitly to be safe.
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        handleLogout();
                    }
                });
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [wallet, token]);

    if (!wallet || !token) {
        return (
            <Login
                onLogin={(newToken, newWallet, newWalletId) => {
                    setWallet(newWallet);
                    setToken(newToken);
                    localStorage.setItem('wallet', newWallet);
                    localStorage.setItem('token', newToken);
                    if (newWalletId) {
                        setWalletId(newWalletId);
                        localStorage.setItem('walletId', newWalletId);
                    }
                }}
            />
        );
    }

    return <ChatLayout wallet={wallet} token={token} walletId={walletId || ''} onLogout={handleLogout} />;
}
