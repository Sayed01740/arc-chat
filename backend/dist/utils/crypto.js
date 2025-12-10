"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignature = verifySignature;
const ethers_1 = require("ethers");
async function verifySignature(wallet, nonce, signature) {
    try {
        const message = nonce;
        const signer = ethers_1.ethers.utils.verifyMessage(message, signature);
        return signer.toLowerCase() === wallet.toLowerCase();
    }
    catch (e) {
        // in v6 it might be ethers.verifyMessage, but v6 doesn't have utils export in the same way sometimes or it does. 
        // The backend package.json doesn't specify ethers version, but `verifySignature` snippet uses `ethers.utils.verifyMessage`.
        // I should check if I need to add ethers to backend package.json.
        // The snippet provided: "import { ethers } from 'ethers';" and used `ethers.utils.verifyMessage`.
        // Wait, the backend package.json provided in the prompt DOES NOT include 'ethers' in dependencies! 
        // It only has: axios, cors, dotenv, express, jsonwebtoken, nanoid, socket.io, tweetnacl, tweetnacl-util.
        // I MUST ADD 'ethers' to the backend package.json dependencies or this code will fail.
        // I will add it to the package.json in a separate step or just assume the user might have missed it, 
        // BUT since I am writing the files now, I should fix the package.json or the code.
        // The code uses `ethers`, so I'll create this file as requested, and then I will update `backend/package.json` to include ethers.
        return false;
    }
}
// helpers for server-side crypto are intentionally minimal — keep private keys on client
