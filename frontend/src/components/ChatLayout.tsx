import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from './ui/Sidebar';
import { type Contact } from '../types';
import Conversation from './ui/Conversation';
import Dashboard from './Dashboard';
import { ethers } from 'ethers';

export default function ChatLayout({ wallet, walletId, onLogout }: { wallet: string; token: string; walletId: string; onLogout: () => void }) {
    const [active, setActive] = useState<string | null>(null);
    const [view, setView] = useState<'dashboard' | 'chat'>('chat');
    const [contacts, setContacts] = useState<Contact[]>([]);

    const API_URL = import.meta.env.VITE_API_URL || '';

    // Load initial conversations (Discovery)
    useEffect(() => {
        if (!wallet) return;

        axios.get(`${API_URL}/user/${wallet}/conversations`)
            .then(res => {
                if (Array.isArray(res.data)) {
                    setContacts(res.data);
                }
            })
            .catch(err => console.error("Failed to load conversations", err));

    }, [wallet]);

    // Real-time Sidebar Updates
    useEffect(() => {
        if (!wallet) return;
        const socket = io(API_URL);
        socket.emit('join', wallet);

        socket.on('message', (msg: any) => {
            const isMe = msg.from.toLowerCase() === wallet.toLowerCase();
            const otherParty = isMe ? msg.to : msg.from;

            // Normalize ID
            const otherId = otherParty.toLowerCase();

            setContacts(prev => {
                // Find existing by lowercase ID to avoid dupes
                const existingIndex = prev.findIndex(c => c.id.toLowerCase() === otherId);
                const existing = prev[existingIndex];

                const updated: Contact = {
                    id: existing ? existing.id : otherParty, // Keep original casing if possible
                    name: existing?.name || `${otherParty.substring(0, 6)}...${otherParty.substring(otherParty.length - 4)}`,
                    unread: (existing?.unread || 0) + (isMe ? 0 : 1),
                    last: msg.content
                };

                const newContacts = [...prev];
                if (existingIndex >= 0) {
                    newContacts.splice(existingIndex, 1);
                }
                return [updated, ...newContacts];
            });
        });

        return () => { socket.disconnect(); };
    }, [wallet, API_URL]);

    async function handleNewChat() {
        const addr = prompt('Enter recipient wallet address (0x...):');
        if (!addr) return;
        if (!ethers.isAddress(addr)) return alert('Invalid Ethereum address');

        // Check if exists
        if (contacts.find(c => c.id.toLowerCase() === addr.toLowerCase())) {
            setActive(addr);
            setView('chat');
            return;
        }

        // Allow any valid address (user might not be registered yet)
        const newContact: Contact = {
            id: addr,
            name: `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`,
            unread: 0
        };
        setContacts(prev => [newContact, ...prev]);
        setActive(addr);
        setView('chat');
    }

    return (
        <div className="h-screen flex bg-background font-sans overflow-hidden">
            <Sidebar
                wallet={wallet}
                contacts={contacts}
                onSelect={(id) => { setActive(id); setView('chat'); }}
                onNew={handleNewChat}
                onLogout={onLogout}
                onView={setView}
            />
            <div className="flex-1 flex flex-col relative">
                {view === 'dashboard' ? (
                    <Dashboard wallet={wallet} walletId={walletId} />
                ) : active ? (
                    <Conversation conversationId={active} wallet={wallet} walletId={walletId} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
                        {/* Background Decorations */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl animate-blob"></div>

                        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto p-8">
                            <div className="w-full max-w-lg flex items-center justify-center mb-8 p-4">
                                <img src="/logo.png" alt="ARCchat" className="w-full h-auto object-contain drop-shadow-2xl" />
                            </div>
                            <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
                                Connect with your peers on the decentralized web.
                                Select a contact or start a new chat to begin.
                            </p>

                            <div className="mt-10 flex flex-col gap-4 w-full">
                                <button
                                    onClick={() => setView('dashboard')}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <span>Control Center</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
