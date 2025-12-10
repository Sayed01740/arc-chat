import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { decodeBase64, encodeBase64, encryptForRecipient, decryptWithSecretKey } from '../utils/cryptoClient';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000');

export default function Chat({ wallet, token }: { wallet: string, token: string }) {
    const [to, setTo] = useState('');
    const [message, setMessage] = useState('');
    const [inbox, setInbox] = useState<any[]>([]);

    useEffect(() => {
        socket.emit('join', wallet);
        socket.on('message', (payload: any) => {
            setInbox((s) => [payload, ...s]);
        });
        return () => { socket.off('message'); };
    }, [wallet]);

    async function send() {
        // fetch recipient public key
        const r = await axios.get(`${import.meta.env.VITE_API_URL}/profile/${to}/publicKey`);
        const recipPub = r.data.pubKey;
        const privBase64 = localStorage.getItem('privKeyBase64');
        if (!privBase64) return alert('no private key');

        const ciphertextBase64 = await encryptForRecipient(privBase64, recipPub, message);
        const upload = await axios.post(`${import.meta.env.VITE_API_URL}/messages/upload`, { ciphertextBase64 });
        const ipfsHash = upload.data.ipfsHash;

        const payload = { to, from: wallet, conversationId: [wallet, to].sort().join(':'), ipfsHash, meta: { ts: Date.now() } };
        socket.emit('message', payload);
        setMessage('');
    }

    return (
        <div style={{ padding: 20 }}>
            <h3>Wallet: {wallet}</h3>
            <div>
                <input placeholder="recipient wallet" value={to} onChange={e => setTo(e.target.value)} />
                <input placeholder="message" value={message} onChange={e => setMessage(e.target.value)} />
                <button onClick={send}>Send</button>
            </div>
            <div>
                <h4>Inbox</h4>
                {inbox.map((m, i) => (
                    <div key={i} style={{ border: '1px solid #ccc', padding: 8, margin: 6 }}>
                        <div>From: {m.from}</div>
                        <div>IPFS: {m.ipfsHash}</div>
                        <div>Meta: {JSON.stringify(m.meta)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
