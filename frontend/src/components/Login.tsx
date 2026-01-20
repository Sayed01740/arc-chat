import { useState } from 'react';
import { BrowserProvider } from 'ethers';
import axios from 'axios';
import { generateKeyPair } from '../utils/cryptoClient';
import { ARC_TESTNET_CONFIG } from './chainConfig';

interface LoginProps {
    onLogin: (token: string, wallet: string, walletId?: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState("Connecting...");
    const [pendingWallet, setPendingWallet] = useState<{ token: string, wallet: string, walletId?: string, recoveryKey: string } | null>(null);

    async function connect() {
        if (!(window as any).ethereum) {
            alert('MetaMask not detected');
            return;
        }

        setLoading(true);
        setStatusText("Connecting...");

        try {
            const provider = new BrowserProvider((window as any).ethereum);
            await provider.send("eth_requestAccounts", []);

            // --- Auto-Switch Network Logic ---
            const network = await provider.getNetwork();
            // Use loose comparison to avoid BigInt version conflicts
            if (network.chainId.toString() !== ARC_TESTNET_CONFIG.CHAIN_ID_DECIMAL.toString()) {
                setStatusText("Switching Network...");
                try {
                    await provider.send("wallet_switchEthereumChain", [{ chainId: ARC_TESTNET_CONFIG.CHAIN_ID_HEX }]);
                } catch (switchError: any) {
                    console.warn("Switch failed, trying add:", switchError);
                    // This error code indicates that the chain has not been added to MetaMask.
                    // Also catching generic error messages from other wallets
                    if (switchError.code === 4902 ||
                        switchError.data?.originalError?.code === 4902 ||
                        switchError.message?.includes("Unrecognized chain")) {

                        setStatusText("Adding Arc Network...");
                        try {
                            await provider.send("wallet_addEthereumChain", [ARC_TESTNET_CONFIG.NETWORK_PARAMS]);
                        } catch (addError: any) {
                            console.error("Add failed", addError);
                            throw new Error("Failed to add Arc Testnet: " + (addError.message || "Unknown error"));
                        }
                    } else {
                        throw new Error("Failed to switch network: " + (switchError.message || "Unknown error"));
                    }
                }

                // Wait for the switch to propagate
                await new Promise(r => setTimeout(r, 2000));
            }
            // ---------------------------------

            // Refresh provider after switch
            const newProvider = new BrowserProvider((window as any).ethereum);
            const signer = await newProvider.getSigner();
            const wallet = await signer.getAddress();

            const API_URL = import.meta.env.VITE_API_URL || '';
            const resp = await axios.post(`${API_URL}/auth/nonce`, { wallet });
            const nonce = resp.data.nonce;

            const signature = await signer.signMessage(nonce);

            // Generate Encryption Keys if new user (simplified)
            // Ideally check if keys exist first
            const keypair = generateKeyPair();
            localStorage.setItem('privKeyBase64', keypair.secretKey);

            const verify = await axios.post(`${API_URL}/auth/verify`, {
                wallet,
                signature,
                publicKey: keypair.publicKey
            });

            onLogin(verify.data.token, wallet);
        } catch (e: any) {
            console.error(e);
            alert('Connection Failed: ' + e.message);
        } finally {
            setLoading(false);
        }

    }

    async function createCircleWallet() {
        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const resp = await axios.post(`${API_URL}/auth/create-circle`, {});

            if (resp.data.success) {
                // Generate a local keypair for chat encryption (independent of wallet)
                // In a real app, this might be derived or stored differently
                const keypair = generateKeyPair();
                // Register this public key with the backend
                await axios.post(`${API_URL}/profile/publicKey`, {
                    wallet: resp.data.wallet,
                    pubKey: keypair.publicKey
                });

                // Save credentials
                localStorage.setItem('privKeyBase64', keypair.secretKey);
                localStorage.setItem('privKeyBase64', keypair.secretKey);

                // Show the wallet info modal instead of immediate login
                setPendingWallet({
                    token: resp.data.token,
                    wallet: resp.data.wallet,
                    walletId: resp.data.walletId,
                    recoveryKey: keypair.secretKey
                });
            }
        } catch (e: any) {
            console.error(e);
            alert('Circle Wallet Creation Failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    }

    if (pendingWallet) {
        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform transition-all p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800">Wallet Created Successfully</h2>

                    <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Your Wallet Address</label>
                        <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-slate-800 break-all bg-white p-2 rounded border border-slate-200 w-full">
                                {pendingWallet.wallet}
                            </code>
                            <button
                                onClick={() => navigator.clipboard.writeText(pendingWallet.wallet)}
                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                title="Copy Address"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chat Recovery Key</label>
                            <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">SECRET</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-slate-800 break-all bg-white p-2 rounded border border-slate-200 w-full blur-[2px] hover:blur-none transition-all duration-300">
                                {pendingWallet.recoveryKey}
                            </code>
                            <button
                                onClick={() => navigator.clipboard.writeText(pendingWallet.recoveryKey)}
                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Copy Key"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            This key is required to recover your messages on a new device. We do not store this for you.
                        </p>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 text-left border border-amber-100">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-bold text-amber-800 mb-1">Important Security Notice</h3>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    This is a <strong>Smart Wallet</strong> managed by ARCchat.
                                    <br />
                                    <strong>Save your Chat Recovery Key above.</strong> If you clear your browser data without it, you will lose access to your encrypted history.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onLogin(pendingWallet.token, pendingWallet.wallet, pendingWallet.walletId)}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all transform hover:scale-[1.02]"
                    >
                        I Understand, Enter App
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Navbar */}
            <nav className="p-6 flex justify-between items-center w-full z-10">
                <div className="flex items-center">
                    <img src="/logo.png" alt="ARCchat" className="h-24 w-auto object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.35)]" />
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden pb-6">
                {/* Subtle Background - Toned down blobs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>

                <div className="relative z-10 max-w-3xl mx-auto space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 shadow-sm text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Arc Testnet Live
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-slate-900">
                        Messaging for the <br />
                        <span className="text-blue-600">Decentralized Web</span>
                    </h1>

                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        End-to-End Encrypted. Wallet Identity. No Central Servers.
                        <br />Experience true privacy with the speed of Web2.
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={connect}
                            disabled={loading}
                            className="w-full sm:w-auto min-w-[200px] group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading && statusText !== "Switching Network..." ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    {statusText}
                                </span>
                            ) : (
                                "Connect Wallet"
                            )}
                        </button>

                        <div className="hidden sm:flex items-center text-slate-300 font-medium text-sm">or</div>

                        <button
                            onClick={createCircleWallet}
                            disabled={loading}
                            className="w-full sm:w-auto min-w-[200px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-blue-200 relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold transition-all duration-200 rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    <path d="M12 7V17M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </svg>
                                Create Circle Wallet
                            </span>
                        </button>
                    </div>

                    <div className="pt-6 grid grid-cols-3 gap-8 text-center border-t border-slate-200 max-w-lg mx-auto">
                        <div>
                            <div className="text-2xl font-bold text-slate-900">0</div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Trackers</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">100%</div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Encrypted</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">Web3</div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Native</div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full py-6 flex flex-col items-center justify-center gap-3 text-center relative z-10 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
                <a
                    href="https://x.com/ArcChat0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-white shadow-sm border border-slate-100 hover:shadow-md hover:text-blue-500 transition-all duration-300"
                    aria-label="Follow us on X (Twitter)"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                </a>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">© 2024 ARCchat • Built on ARC Testnet</p>
            </footer>
        </div>
    );
}
