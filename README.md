# Blockchain Chat Starter

Monorepo: frontend (React + Vite), backend (Express + Socket.IO), contracts (Solidity + Hardhat).

Quick start (local dev):
1. Copy `.env.example` to `.env` and fill keys (INFURA_API_KEY, PRIVATE_KEY for deploy, JWT_SECRET).
2. Install dependencies:
   - `npm run bootstrap` (installs root, frontend, backend, and contracts deps)
3. Start backend: `npm --prefix backend run dev`
4. Start frontend: `npm --prefix frontend run dev`
5. Compile & deploy contracts (optional): `npm --prefix contracts run deploy:local`

This scaffold provides basic identity registration and client-side encryption helpers. Use it as the starting point for the full app.
