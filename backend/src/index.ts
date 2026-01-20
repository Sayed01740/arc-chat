import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { verifySignature } from './utils/crypto';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Simple in-memory nonce store (for demo only)
const nonces = new Map<string, string>();

app.post('/auth/nonce', (req, res) => {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).send({ error: 'wallet required' });
    const nonce = randomBytes(16).toString('hex');
    nonces.set(wallet.toLowerCase(), nonce);
    res.send({ nonce });
});

app.post('/auth/verify', async (req, res) => {
    const { wallet, signature } = req.body;
    if (!wallet || !signature) return res.status(400).send({ error: 'wallet and signature required' });
    const nonce = nonces.get(wallet.toLowerCase());
    if (!nonce) return res.status(400).send({ error: 'nonce not found' });

    const valid = await verifySignature(wallet, nonce, signature);
    if (!valid) return res.status(401).send({ error: 'invalid signature' });

    const token = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: '7d' });
    nonces.delete(wallet.toLowerCase());
    res.send({ token });
});

// New Endpoint: Instant login/signup with Circle
app.post('/auth/create-circle', async (req, res) => {
    try {
        // 1. Create a new Circle Wallet (Developer Controlled)
        const walletData = await circleClient.createWallet();
        const walletAddress = walletData.address; // Extract address

        // 2. Since we (the developer) control this wallet, we trust the creation process.
        // We can issue a JWT token immediately for this user.
        const token = jwt.sign({ wallet: walletAddress }, JWT_SECRET, { expiresIn: '7d' });

        res.send({
            success: true,
            wallet: walletAddress,
            token,
            walletId: walletData.id
        });
    } catch (error: any) {
        console.error("Circle Login Failed:", error);
        res.status(500).send({ error: 'Failed to create Circle wallet' });
    }
});

// Simple publicKey storage in-memory (in prod anchor on-chain)
const publicKeys = new Map<string, string>();
app.post('/profile/publicKey', (req, res) => {
    const { wallet, pubKey } = req.body;
    if (!wallet || !pubKey) return res.status(400).send({ error: 'wallet and pubKey required' });
    publicKeys.set(wallet.toLowerCase(), pubKey);
    res.send({ ok: true });
});

app.get('/profile/:wallet/publicKey', (req, res) => {
    const wallet = req.params.wallet.toLowerCase();
    const pk = publicKeys.get(wallet);
    if (!pk) return res.status(404).send({ error: 'not found' });
    res.send({ pubKey: pk });
});

// In-memory message store (Replace with DB/IPFS in production)
interface Message {
    id: string;
    conversationId: string;
    from: string;
    to: string;
    content: string; // Encrypted or plaintext
    ipfsHash?: string;
    timestamp: number;
    read?: boolean;
}

const messages: Message[] = [];

// Get messages for a conversation
app.get('/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const { wallet } = req.query; // requester wallet to ensure they are part of convo

    // Simple filter: return all messages in this conversation
    // In strict mode, verify 'wallet' is one of the participants
    const history = messages.filter(m => m.conversationId === conversationId);
    // Sort by time
    history.sort((a, b) => a.timestamp - b.timestamp);

    res.send(history);
});

// Send/Save Message
app.post('/messages/send', (req, res) => {
    const { from, to, conversationId, content, ipfsHash } = req.body;

    if (!from || !to || !conversationId) {
        return res.status(400).send({ error: 'Missing fields' });
    }

    const newMessage: Message = {
        id: randomBytes(8).toString('hex'),
        conversationId,
        from,
        to,
        content,
        ipfsHash,
        timestamp: Date.now(),
        read: false
    };

    messages.push(newMessage);

    // Emit via Socket
    // Emit to both sender and recipient rooms
    io.to(to.toLowerCase()).emit('message', newMessage);
    io.to(from.toLowerCase()).emit('message', newMessage);

    res.send({ success: true, message: newMessage });
});

// Mark messages as Read
app.post('/messages/read', (req, res) => {
    const { conversationId, wallet } = req.body;
    // Mark all messages in this conversation sent TO this wallet as read
    messages.forEach(m => {
        if (m.conversationId === conversationId && m.to.toLowerCase() === wallet.toLowerCase()) {
            m.read = true;
        }
    });
    res.send({ success: true });
});

// New Endpoint: Get all conversations for a wallet (Discovery)
app.get('/user/:wallet/conversations', (req, res) => {
    const wallet = req.params.wallet.toLowerCase();

    // 1. Find all messages involving this wallet
    const relevant = messages.filter(m =>
        m.from.toLowerCase() === wallet || m.to.toLowerCase() === wallet
    );

    // 2. Identify unique contacts
    const contactMap = new Map<string, any>();

    relevant.forEach(m => {
        const isSender = m.from.toLowerCase() === wallet;
        const otherParty = isSender ? m.to.toLowerCase() : m.from.toLowerCase();

        if (!contactMap.has(otherParty)) {
            contactMap.set(otherParty, {
                id: otherParty,
                lastTimestamp: 0,
                lastMsg: '',
                unread: 0
            });
        }

        const contact = contactMap.get(otherParty);
        // Update last message
        if (m.timestamp > contact.lastTimestamp) {
            contact.lastTimestamp = m.timestamp;
            contact.lastMsg = m.content;
        }

        // Calculate Unread Count
        // If I am the recipient (to === wallet) AND message is NOT read
        if (m.to.toLowerCase() === wallet && !m.read) {
            contact.unread += 1;
        }
    });

    // 3. Convert to array and sort by recent
    const contacts = Array.from(contactMap.values())
        .map(c => ({
            id: c.id,
            name: `${c.id.substring(0, 6)}...${c.id.substring(c.id.length - 4)}`,
            last: c.lastMsg,
            unread: c.unread,
            timestamp: c.lastTimestamp
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

    res.send(contacts);
});

app.post('/messages/upload', (req, res) => {
    // expects body: { ciphertextBase64 }
    const { ciphertextBase64 } = req.body;
    if (!ciphertextBase64) return res.status(400).send({ error: 'ciphertextBase64 required' });
    // For demo we return a fake ipfs hash
    const fakeHash = 'Qm' + randomBytes(18).toString('hex');
    res.send({ ipfsHash: fakeHash });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.on('join', (wallet) => {
        socket.join(wallet.toLowerCase());
    });
    // Legacy socket emit support (optional)
});

// Export for Vercel
export default app;

// --- Circle Wallet Integration ---
import { circleClient } from './utils/circleClient';

// Changed to app.all to allow browser testing (GET) and API usage (POST)
app.all('/wallet/create', async (req, res) => {
    // In a real app, you would link this wallet to the 'req.user' (JWT verified)
    // For now, allow creating a wallet and returning it
    try {
        console.log('Creating Circle Wallet...');
        const wallet = await circleClient.createWallet();
        res.send({ success: true, wallet });
    } catch (error: any) {
        res.status(500).send({ error: 'Failed to create wallet', details: error.message });
    }
});

app.get('/wallet/:id/balance', async (req, res) => {
    try {
        const balances = await circleClient.checkWalletBalance(req.params.id);
        res.send({ balances });
    } catch (error: any) {
        res.status(500).send({ error: 'Failed to fetch balance' });
    }
});

// Mock Session Store
const userSessions = new Map<string, number>(); // walletId -> expiryTimestamp

app.get('/session/:walletId', (req, res) => {
    const { walletId } = req.params;
    const expiry = userSessions.get(walletId) || 0;
    const now = Date.now();
    res.send({
        active: expiry > now,
        remainingMs: Math.max(0, expiry - now)
    });
});

app.post('/payment/pay-hourly', async (req, res) => {
    const { walletId } = req.body;

    // In a real app, you'd want to handle this gracefully:
    try {
        // 1. Define payment parameters
        const TOKEN_ID = "078508a8-3694-5510-ab35-31a89c89280d"; // USDC on Testnet (Example ID)
        const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
        const FEE_AMOUNT = "0.01";

        // 2. Execute transfer (Mocking success if funds fail for demo continuity)
        // const transfer = await circleClient.executeTransfer(walletId, TOKEN_ID, TREASURY_ADDRESS, FEE_AMOUNT);
        // console.log("Payment Transfer Initiated:", transfer.id);
        console.log(`Processing payment for wallet ${walletId}...`);

        // 3. On success, extend session
        const ONE_HOUR = 60 * 60 * 1000;
        const currentExpiry = userSessions.get(walletId) || Date.now();
        const newExpiry = Math.max(Date.now(), currentExpiry) + ONE_HOUR;

        userSessions.set(walletId, newExpiry);

        res.send({ success: true, newExpiry });
    } catch (error: any) {
        console.error("Payment failed", error);
        res.status(500).send({ error: "Payment failed" });
    }
});
// ---------------------------------

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
}
