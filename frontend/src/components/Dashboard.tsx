import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { ARC_TESTNET_CONFIG } from './chainConfig';

interface DashboardProps {
    wallet: string;
    walletId: string;
}

export default function Dashboard({ wallet, walletId }: DashboardProps) {
    const [balance, setBalance] = useState<string>('0.00');
    const [sessionStatus, setSessionStatus] = useState<{ active: boolean; remainingMs: number }>({ active: false, remainingMs: 0 });
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [wallet, walletId]);

    const effectiveId = walletId || wallet;

    // Helper: Ensure user is on Arc Testnet
    async function checkAndSwitchNetwork(provider: BrowserProvider) {
        const network = await provider.getNetwork();
        console.log("Current Chain ID:", network.chainId);

        if (network.chainId !== BigInt(ARC_TESTNET_CONFIG.CHAIN_ID_DECIMAL)) {
            setStatusMsg('Switching Network...');
            try {
                await provider.send("wallet_switchEthereumChain", [{ chainId: ARC_TESTNET_CONFIG.CHAIN_ID_HEX }]);
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    setStatusMsg('Adding Arc Network...');
                    try {
                        await provider.send("wallet_addEthereumChain", [ARC_TESTNET_CONFIG.NETWORK_PARAMS]);
                    } catch (addError) {
                        throw new Error("Failed to add Arc Testnet to wallet.");
                    }
                } else {
                    throw new Error("Failed to switch network. Please connect to Arc Testnet.");
                }
            }
            // Re-verify
            const newNetwork = await provider.getNetwork();
            if (newNetwork.chainId !== BigInt(ARC_TESTNET_CONFIG.CHAIN_ID_DECIMAL)) {
                throw new Error("Network switch failed. Please manually switch to Arc Testnet.");
            }
        }
    }

    async function fetchData() {
        if (!effectiveId) return;
        try {
            // Priority 1: Direct Blockchain Read
            if ((window as any).ethereum) {
                try {
                    const provider = new BrowserProvider((window as any).ethereum);
                    // Silently check network match for reading balance, don't force switch just for reading if unnecessary 
                    // (though for accurate results we technically should, but it's annoying UX to prompt on load)
                    // Instead, we try to read. If it fails with BAD_DATA (0x), we assume wrong network and show "Switch Net".

                    const contract = new Contract(ARC_TESTNET_CONFIG.USDC_ADDRESS, ARC_TESTNET_CONFIG.ERC20_ABI, provider);
                    const bal = await contract.balanceOf(wallet);
                    const formatted = formatUnits(bal, ARC_TESTNET_CONFIG.USDC_DECIMALS);

                    setBalance(parseFloat(formatted).toFixed(4));
                } catch (err: any) {
                    console.warn("USDC Balance Fetch Failed:", err);
                    if (err.code === 'BAD_DATA' || err.message?.includes('could not decode')) {
                        setBalance("Wrong Net"); // Visual indicator
                    } else {
                        setBalance("0.0000");
                    }
                }
            } else if (walletId) {
                // Priority 2: Backend Fallback
                const balResp = await axios.get(`${API_URL}/wallet/${walletId}/balance`);
                const usdcBal = balResp.data.balances.find((b: any) => b.currency === 'USDC' || b.currency === 'USD');
                if (usdcBal) setBalance(usdcBal.amount);
            }

            // 3. Priority Session Check (Local > Backend for Vercel)
            const localExpiry = localStorage.getItem('sessionExpiry_' + wallet.toLowerCase());
            let sessionData = { active: false, remainingMs: 0 };

            try {
                const sessResp = await axios.get(`${API_URL}/session/${effectiveId}`);
                sessionData = sessResp.data;
            } catch (e) { console.warn("Backend session check failed, falling back to local"); }

            // If backend says inactive but local says active, trust local
            if (!sessionData.active && localExpiry) {
                const exp = parseInt(localExpiry, 10);
                const now = Date.now();
                if (exp > now) {
                    sessionData = {
                        active: true,
                        remainingMs: exp - now
                    };
                    // Optionally push back to server to re-sync? No point if it's ephemeral.
                }
            } else if (sessionData.active) {
                // If server is active, update local
                const newExp = Date.now() + sessionData.remainingMs;
                localStorage.setItem('sessionExpiry_' + wallet.toLowerCase(), newExp.toString());
            }

            setSessionStatus(sessionData);

        } catch (e) {
            console.error("Dashboard data load error", e);
        }
    }

    async function extendSession() {
        // Enforce Contract Configuration
        if (!ARC_TESTNET_CONFIG.SESSION_CONTRACT_ADDRESS) {
            alert("Payment System Maintenance: Contract Address Missing. Please contact support.");
            return;
        }

        if (!confirm(`Confirm session extension? This will trigger a wallet transaction to pay ${ARC_TESTNET_CONFIG.HOURLY_RATE_USDC} USDC.`)) return;

        setLoading(true);

        try {
            // FLOW A: Circle Embedded Wallet (Prioritized if walletId exists)
            // Even if window.ethereum exists (e.g. metamask installed), if we have a walletId,
            // it means the user logged in via Circle, so we MUST use Circle flow.
            if (walletId) {
                setStatusMsg('Processing via Circle Wallet...');
                try {
                    // Call backend to execute Circle transfer
                    const resp = await axios.post(`${API_URL}/payment/pay-hourly`, {
                        walletId: walletId
                    });

                    if (resp.data.success) {
                        alert('Success! Session Extended via Circle Wallet.');
                        // Update local state to reflect backend change immediately
                        const newExpiry = resp.data.newExpiry || (Date.now() + 3600000);
                        localStorage.setItem('sessionExpiry_' + wallet.toLowerCase(), newExpiry.toString());
                        fetchData();
                    } else {
                        throw new Error(resp.data.error || 'Payment failed');
                    }
                } catch (circleErr: any) {
                    throw new Error("Circle Payment Failed: " + (circleErr.response?.data?.error || circleErr.message));
                }
                return; // Exit Circle flow
            }

            // FLOW B: External EVM Wallet (MetaMask / Rabby)
            setStatusMsg('Initializing Wallet...');
            if (!(window as any).ethereum) throw new Error("No crypto wallet found");

            const provider = new BrowserProvider((window as any).ethereum);

            // 0. Ensure Network
            await checkAndSwitchNetwork(provider);

            const signer = await provider.getSigner();

            const usdcContract = new Contract(ARC_TESTNET_CONFIG.USDC_ADDRESS, ARC_TESTNET_CONFIG.ERC20_ABI, signer);
            const sessionContract = new Contract(ARC_TESTNET_CONFIG.SESSION_CONTRACT_ADDRESS, ARC_TESTNET_CONFIG.SESSION_ABI, signer);

            // 1. Check Allowance
            setStatusMsg('Checking Token Allowance...');
            const allowance = await usdcContract.allowance(wallet, ARC_TESTNET_CONFIG.SESSION_CONTRACT_ADDRESS);

            if (allowance < ARC_TESTNET_CONFIG.HOURLY_RATE_UNITS) {
                setStatusMsg('Approval Required. Please sign in wallet...');
                try {
                    // Approve enough for ~100 sessions to minimize future prompts
                    const approveAmount = ARC_TESTNET_CONFIG.HOURLY_RATE_UNITS * 100n;
                    const approveTx = await usdcContract.approve(ARC_TESTNET_CONFIG.SESSION_CONTRACT_ADDRESS, approveAmount);

                    setStatusMsg('Approving USDC (Waiting for confirmation)...');
                    await approveTx.wait();
                    console.log("USDC Approved");
                } catch (e: any) {
                    if (e.info?.error?.code === 4001 || e.message?.includes("user rejected")) {
                        throw new Error("Approval rejected by user.");
                    }
                    throw new Error("USDC Approval failed: " + (e.message || "Unknown error"));
                }
            }

            // 2. Pay Fee
            setStatusMsg('Please Sign Payment Transaction...');
            try {
                const payTx = await sessionContract.paySessionFee(ARC_TESTNET_CONFIG.HOURLY_RATE_UNITS);
                setStatusMsg('Processing Payment on Chain...');
                await payTx.wait();
                console.log("Payment Confirmed on Chain");

                // 3. Sync Backend
                setStatusMsg('Syncing Session...');
                await axios.post(`${API_URL}/payment/pay-hourly`, {
                    walletId: effectiveId,
                    txHash: payTx.hash,
                    enforced: true
                });

                // Fix: Store expiry locally because Vercel backend is ephemeral (stateless)
                const expiry = Date.now() + (60 * 60 * 1000);
                localStorage.setItem('sessionExpiry_' + wallet.toLowerCase(), expiry.toString());

                alert('Success! Session Extended.');
                fetchData();

            } catch (e: any) {
                if (e.info?.error?.code === 4001 || e.message?.includes("user rejected")) {
                    throw new Error("Transaction rejected by user.");
                }
                throw new Error("Payment transaction failed: " + (e.message || "Unknown error"));
            }

        } catch (e: any) {
            console.error("Extension Error:", e);
            alert('Extension Failed: ' + e.message);
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    }

    const remainingMinutes = Math.floor(sessionStatus.remainingMs / 60000);

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-background text-foreground">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Control Center</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground text-sm font-mono">{wallet}</p>
                        <button onClick={fetchData} className="text-primary hover:text-primary/80 transform active:rotate-180 transition-all" title="Refresh Data">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <img
                        src={localStorage.getItem('userAvatar') || `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet}`}
                        alt="Profile"
                        className="w-10 h-10 rounded-full bg-muted border-2 border-border object-cover"
                    />
                    <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-full border border-border">
                        <span className={`w-2 h-2 rounded-full ${sessionStatus.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className="text-xs font-semibold uppercase tracking-wider">{sessionStatus.active ? 'Live' : 'Inactive'}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Account Balance</h3>
                    <div className="text-3xl font-bold text-foreground mb-1">{balance} <span className="text-lg text-muted-foreground">USDC</span></div>
                    <div className="text-sm text-muted-foreground">ARC Testnet Reserves</div>
                </div>

                {/* Session Card */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Session Status</h3>

                    <div className="flex items-center justify-between mb-6">
                        <div className="text-3xl font-bold text-foreground">{sessionStatus.active ? `${remainingMinutes}m` : 'Expired'}</div>
                        <div className="text-xs text-muted-foreground text-right">Remaining</div>
                    </div>

                    <button
                        onClick={extendSession}
                        disabled={loading || !ARC_TESTNET_CONFIG.SESSION_CONTRACT_ADDRESS}
                        className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Processing...' : `Extend Session (${ARC_TESTNET_CONFIG.HOURLY_RATE_USDC} USDC)`}
                    </button>
                    {loading && (
                        <div className="text-xs text-primary mt-2 text-center animate-pulse font-mono">
                            {statusMsg || 'Interacting with Blockchain...'}
                        </div>
                    )}
                    {!sessionStatus.active && !loading && (
                        <div className="text-xs text-red-400 mt-2 text-center">Chat access is currently disabled.</div>
                    )}
                </div>

                {/* Rate Card */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-sm">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Hourly Rate</h3>
                    <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-foreground">{ARC_TESTNET_CONFIG.HOURLY_RATE_USDC}</span>
                        <span className="ml-2 text-lg text-muted-foreground">USDC / hr</span>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                        Small micro-payments ensure network health and user verification.
                    </p>
                </div>
            </div>


            {/* Recent Activity section removed */}
        </div>
    );
}
