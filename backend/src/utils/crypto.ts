import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { ethers } from 'ethers';

export async function verifySignature(wallet: string, nonce: string, signature: string) {
    try {
        const message = nonce;
        const signer = ethers.utils.verifyMessage(message, signature);
        return signer.toLowerCase() === wallet.toLowerCase();
    } catch (e) {
        return false;
    }
}

// helpers for server-side crypto are intentionally minimal — keep private keys on client
