import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { encryptForRecipient } from '../../utils/cryptoClient';

// Re-using the same socket connection might be better in a context, but this works for the starter.
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000');

export default function Conversation({ conversationId, wallet }: { conversationId: string; wallet: string }) {
    const [message, setMessage] = useState('');
    const [inbox, setInbox] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Join own room to receive
        socket.emit('join', wallet);

        const handleMessage = (payload: any) => {
            setInbox((s) => [...s, payload]);
            // Auto-scroll
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        socket.on('message', handleMessage);
        return () => { socket.off('message', handleMessage); };
    }, [wallet]);

    async function send() {
        if (!message.trim()) return;

        try {
            // 1. Fetch recipient public key
            // Note: In a real app, handle 404s if key not found
            const r = await axios.get(`${import.meta.env.VITE_API_URL}/profile/${conversationId}/publicKey`);
            const recipPub = r.data.pubKey;

            const privBase64 = localStorage.getItem('privKeyBase64');
            if (!privBase64) return alert('No private key found in storage');

            // 2. Encrypt
            const ciphertextBase64 = await encryptForRecipient(privBase64, recipPub, message);

            // 3. Upload (Stub)
            const upload = await axios.post(`${import.meta.env.VITE_API_URL}/messages/upload`, { ciphertextBase64 });
            const ipfsHash = upload.data.ipfsHash;

            // 4. Send over Socket
            const payload = {
                to: conversationId,
                from: wallet,
                conversationId: [wallet, conversationId].sort().join(':'),
                ipfsHash,
                content: message, // For local echo only! Real app should decrypt 'ipfsHash' content.
                meta: { ts: Date.now() }
            };

            socket.emit('message', payload);

            // Optimistic UI update
            setInbox((s) => [...s, { ...payload, isSelf: true }]);
            setMessage('');
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        } catch (e) {
            console.error(e);
            alert('Failed to send message. Ensure recipient has registered/logged in once.');
        }
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="h-16 border-b flex items-center px-6 bg-white shadow-sm z-10">
                <div className="font-bold text-lg text-gray-800">Chat with {conversationId.substring(0, 6)}...</div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                {inbox.filter(m => m.conversationId?.includes(conversationId) || m.to === conversationId || m.from === conversationId).map((m, i) => {
                    const isMe = m.from?.toLowerCase() === wallet.toLowerCase() || m.isSelf;
                    return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm text-sm ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white borderComponent text-gray-800 rounded-bl-none border border-gray-200'
                                }`}>
                                {/* We display raw content for echo, or ipfsHash for received (decryption logic omitted for UI demo speed) */}
                                {m.content || `Encrypted Blob: ${m.ipfsHash.substring(0, 10)}...`}
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {new Date(m.meta?.ts || Date.now()).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-white">
                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                    <input
                        className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="Type a message..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && send()}
                    />
                    <button
                        onClick={send}
                        disabled={!message.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-3 shadow-md transition-all flex items-center justify-center h-12 w-12"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
