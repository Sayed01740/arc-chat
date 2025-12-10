import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import ChatLayout from './components/ChatLayout';

export default function App() {
    const [wallet, setWallet] = useState<string | null>(localStorage.getItem('wallet'));
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    if (!wallet || !token) return <Login onAuth={(w, t) => { setWallet(w); setToken(t); localStorage.setItem('wallet', w); localStorage.setItem('token', t); }} />;

    return <ChatLayout wallet={wallet} token={token} />;
}
