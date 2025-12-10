"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const crypto_2 = require("./utils/crypto");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
// Simple in-memory nonce store (for demo only)
const nonces = new Map();
app.post('/auth/nonce', (req, res) => {
    const { wallet } = req.body;
    if (!wallet)
        return res.status(400).send({ error: 'wallet required' });
    const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
    nonces.set(wallet.toLowerCase(), nonce);
    res.send({ nonce });
});
app.post('/auth/verify', async (req, res) => {
    const { wallet, signature } = req.body;
    if (!wallet || !signature)
        return res.status(400).send({ error: 'wallet and signature required' });
    const nonce = nonces.get(wallet.toLowerCase());
    if (!nonce)
        return res.status(400).send({ error: 'nonce not found' });
    const valid = await (0, crypto_2.verifySignature)(wallet, nonce, signature);
    if (!valid)
        return res.status(401).send({ error: 'invalid signature' });
    const token = jsonwebtoken_1.default.sign({ wallet }, JWT_SECRET, { expiresIn: '7d' });
    nonces.delete(wallet.toLowerCase());
    res.send({ token });
});
// Simple publicKey storage in-memory (in prod anchor on-chain)
const publicKeys = new Map();
app.post('/profile/publicKey', (req, res) => {
    const { wallet, pubKey } = req.body;
    if (!wallet || !pubKey)
        return res.status(400).send({ error: 'wallet and pubKey required' });
    publicKeys.set(wallet.toLowerCase(), pubKey);
    res.send({ ok: true });
});
app.get('/profile/:wallet/publicKey', (req, res) => {
    const wallet = req.params.wallet.toLowerCase();
    const pk = publicKeys.get(wallet);
    if (!pk)
        return res.status(404).send({ error: 'not found' });
    res.send({ pubKey: pk });
});
// IPFS upload stub (you should implement proper IPFS client)
app.post('/messages/upload', (req, res) => {
    // expects body: { ciphertextBase64 }
    const { ciphertextBase64 } = req.body;
    if (!ciphertextBase64)
        return res.status(400).send({ error: 'ciphertextBase64 required' });
    // For demo we return a fake ipfs hash
    const fakeHash = 'Qm' + (0, crypto_1.randomBytes)(18).toString('hex');
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
server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
