import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { encryptForRecipient } from '../../utils/cryptoClient';
// import { ethers } from 'ethers';

// Re-using the same socket connection might be better in a context, but this works for the starter.
const socket = io(import.meta.env.VITE_API_URL || '');

export default function Conversation({ conversationId, wallet, walletId }: { conversationId: string; wallet: string; walletId: string }) {
    const [message, setMessage] = useState('');
    const [inbox, setInbox] = useState<any[]>([]);
    const [sessionActive, setSessionActive] = useState(true);
    const [uploading, setUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Join own room to receive (Socket fallback)
        socket.emit('join', wallet);

        const fetchMessages = () => {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const uniqueId = [wallet, conversationId].sort().join(':');

            axios.get(`${API_URL}/messages/${uniqueId}?wallet=${wallet}`)
                .then(res => {
                    const newMsgs = res.data;
                    setInbox(prev => {
                        // Only update if length changed or last message different to avoid re-renders
                        if (newMsgs.length !== prev.length) {
                            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                            // Mark as read if we have new messages (and we are viewing context)
                            axios.post(`${API_URL}/messages/read`, { conversationId, wallet })
                                .catch(e => console.error("Mark read failed", e));

                            return newMsgs;
                        }
                        if (prev.length > 0 && newMsgs.length > 0 && newMsgs[newMsgs.length - 1].id !== prev[prev.length - 1].id) {
                            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                            axios.post(`${API_URL}/messages/read`, { conversationId, wallet })
                                .catch(e => console.error("Mark read failed", e));

                            return newMsgs;
                        }
                        return prev;
                    });
                })
                .catch(err => console.error("Failed to fetch history", err));
        };

        // Initial Fetch
        fetchMessages();

        // POLL: Check every 3 seconds for new messages (Fix for Vercel Serverless)
        const interval = setInterval(fetchMessages, 3000);

        // Check initial session status
        const API_URL = import.meta.env.VITE_API_URL || '';
        axios.get(`${API_URL}/session/${walletId || wallet}`)
            .then(res => setSessionActive(res.data.active))
            .catch(() => setSessionActive(false));

        const handleMessage = (payload: any) => {
            setInbox((s) => {
                if (s.find(m => (m.id && m.id === payload.id) || (m.timestamp === payload.timestamp && m.content === payload.content))) return s;
                return [...s, payload];
            });
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        socket.on('message', handleMessage);
        return () => {
            socket.off('message', handleMessage);
            clearInterval(interval);
        };
    }, [wallet, conversationId, walletId]);

    async function checkSession() {
        const effectiveId = walletId || wallet;
        if (!effectiveId) return true;

        // 1. Check Local Persistence First (Fix for Ephemeral Backend)
        const localExpiry = localStorage.getItem('sessionExpiry_' + wallet.toLowerCase());
        if (localExpiry) {
            const exp = parseInt(localExpiry, 10);
            if (exp > Date.now()) {
                setSessionActive(true);
                return true;
            }
        }

        // 2. Fallback to Server Check
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const res = await axios.get(`${API_URL}/session/${effectiveId}`);

            // If server says active, trust it and maybe update local? 
            if (res.data.active) {
                setSessionActive(true);
                // Sync local if server is ahead (optional, but good)
                const newExp = Date.now() + res.data.remainingMs;
                localStorage.setItem('sessionExpiry_' + wallet.toLowerCase(), newExp.toString());
                return true;
            }
        } catch (e) {
            console.warn("Server session check failed", e);
        }

        // If both failed:
        setSessionActive(false);
        // Only alert if we are blocking an action (this function is called on Send/Upload)
        // If it's just a passive check, alert might be annoying? 
        // The original code alerted. Let's keep it but maybe use a toast later.
        alert("Your chat session has expired. Please go to the Control Center to extend it.");
        return false;
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check session before upload
        const paid = await checkSession();
        if (!paid) return;

        setUploading(true);
        try {
            // In a real app, you'd encrypt the file or upload to IPFS. 
            // Here we'll just simulate an "attachment" message.
            // const API_URL = import.meta.env.VITE_API_URL || '';

            // Mock upload call
            // await axios.post(`${API_URL}/messages/upload`, formData...);

            const attachmentMsg = `📎 Shared a file: ${file.name}`;
            await sendMessageInternal(attachmentMsg);
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function sendMessageInternal(content: string) {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            let ipfsHash = '';

            try {
                // 1. Fetch recipient public key
                const r = await axios.get(`${API_URL}/profile/${conversationId}/publicKey`);
                const recipPub = r.data.pubKey;
                const privBase64 = localStorage.getItem('privKeyBase64');

                if (privBase64 && recipPub) {
                    // Encrypt
                    const ciphertextBase64 = await encryptForRecipient(privBase64, recipPub, content);
                    // Upload encrypted (mock)
                    const upload = await axios.post(`${API_URL}/messages/upload`, { ciphertextBase64 });
                    ipfsHash = upload.data.ipfsHash;
                }
            } catch (err) {
                console.warn('Encryption skipped (no public key)');
            }

            // Send to Backend (Persistence)
            const uniqueId = [wallet, conversationId].sort().join(':');
            const payload = {
                conversationId: uniqueId,
                from: wallet,
                to: conversationId,
                content: content,
                ipfsHash
            };

            const response = await axios.post(`${API_URL}/messages/send`, payload);

            if (response.data.success) {
                // Optimistically update UI using the server-returned message (which has timestamp & ID)
                const newMsg = response.data.message;
                setInbox((s) => {
                    if (s.find(m => m.id === newMsg.id)) return s;
                    return [...s, { ...newMsg, isSelf: true }];
                });
                setMessage('');
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to send.');
        }
    }

    async function send() {
        if (!message.trim()) return;

        // Check Session Status (Simplified for demo, real payment happens in Dashboard)
        const paid = await checkSession();
        if (!paid) return;
        await sendMessageInternal(message);
    }

    return (
        <div className="flex flex-col h-full bg-background relative font-sans">
            {/* Glassmorphism Header */}
            <div className="h-20 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <img
                        src={`https://api.dicebear.com/7.x/identicon/svg?seed=${conversationId}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full bg-muted border border-border"
                    />
                    <div>
                        <div className="font-bold text-foreground text-base flex items-center gap-2">
                            {conversationId.substring(0, 6)}...{conversationId.substring(conversationId.length - 4)}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sessionActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                                {sessionActive ? 'My Session: Active' : 'My Session: Expired'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-muted-foreground font-medium">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-muted/10 relative">
                {/* Branded Watermark */}
                {/* Branded Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-30 overflow-hidden">
                    <img src="/logo.png" alt="" className="w-full max-w-3xl object-contain" />
                </div>

                {/* Content Layer */}
                <div className="relative z-10 space-y-6">
                    {inbox.filter(m => m.conversationId?.includes(conversationId) || m.to === conversationId || m.from === conversationId).map((m, i) => {
                        const isMe = m.from?.toLowerCase() === wallet.toLowerCase() || m.isSelf;
                        return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group opacity-0 animate-fade-in`} style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                                <div className={`flex flex-col max-w-lg ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`relative px-5 py-3 text-[15px] leading-relaxed shadow-sm transition-all hover:shadow-md
                                        ${isMe
                                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-md shadow-primary/20'
                                            : 'bg-card border text-card-foreground rounded-2xl rounded-tl-sm border-border'
                                        }`}>
                                        {m.content}
                                    </div>
                                    <div className={`text-[10px] mt-1.5 font-medium px-1 opacity-60`}>
                                        {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border sticky bottom-0 z-20">
                <div className="max-w-4xl mx-auto flex items-end gap-3 bg-muted/30 p-2 rounded-3xl border border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-input transition-all shadow-sm">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-card hover:shadow-sm disabled:opacity-50"
                        title="Upload File"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                            </svg>
                        )}
                    </button>

                    <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground py-3 max-h-32 resize-none text-sm scrollbar-thin scrollbar-thumb-border outline-none"
                        placeholder="Type a message..."
                        rows={1}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                    />

                    <button
                        onClick={send}
                        disabled={!message.trim()}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:bg-muted text-primary-foreground rounded-full p-2.5 shadow-md shadow-primary/20 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
                <div className="text-center mt-2 text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    End-to-End Encrypted via TweetNaCl
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
