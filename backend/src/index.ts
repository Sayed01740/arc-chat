import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { verifySignature } from './utils/crypto';

dotenv.config();

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

// IPFS upload stub (you should implement proper IPFS client)
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
    socket.on('message', (payload) => {
        // payload: { to, conversationId, ipfsHash, meta }
        const toRoom = payload.to.toLowerCase();
        io.to(toRoom).emit('message', payload);
    });
});

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
}
