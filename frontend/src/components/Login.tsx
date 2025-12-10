import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

export default function Login({ onAuth }: { onAuth: (wallet: string, token: string) => void }) {
    const [connecting, setConnecting] = useState(false);

    async function connect() {
        setConnecting(true);
        try {
            if (!(window as any).ethereum) return alert('Install MetaMask');
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();
            const wallet = await signer.getAddress();

            const resp = await axios.post(`${import.meta.env.VITE_API_URL}/auth/nonce`, { wallet });
            const nonce = resp.data.nonce;
            const signature = await signer.signMessage(nonce);

            const verify = await axios.post(`${import.meta.env.VITE_API_URL}/auth/verify`, { wallet, signature });
            const token = verify.data.token;
            onAuth(wallet, token);

            const keypair = await generateKeyPair();
            const pubBase64 = keypair.publicKey;
            await axios.post(`${import.meta.env.VITE_API_URL}/profile/publicKey`, { wallet, pubKey: pubBase64 });
            localStorage.setItem('privKeyBase64', keypair.secretKey);
        } catch (e) {
            console.error(e);
            alert('Auth failed');
        } finally {
            setConnecting(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-200 mb-8">Sign in to access your secure chats</p>

                <button
                    onClick={connect}
                    disabled={connecting}
                    className="w-full bg-white text-indigo-600 font-bold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {connecting ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
                        </span>
                    ) : (
                        'Connect Wallet'
                    )}
                </button>
                <p className="mt-6 text-xs text-white/60">Powered by Ethereum & Arc Network</p>
            </div>
        </div>
    );
}

async function generateKeyPair() {
    const nacl = (await import('tweetnacl')).default;
    const util = (await import('tweetnacl-util')).default;
    const kp = nacl.box.keyPair();
    return {
        publicKey: util.encodeBase64(kp.publicKey),
        secretKey: util.encodeBase64(kp.secretKey)
    };
}
