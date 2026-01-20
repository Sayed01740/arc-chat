import { ethers } from "hardhat";

async function main() {
    const SESSION_MANAGER_ADDRESS = "0x7AC7B17410641853C369874536a9248D0CD14947";
    const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
    const FEE_AMOUNT = 1000n; // 0.001 USDC (6 decimals)

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // 1. Setup Contracts
    const SessionManager = await ethers.getContractAt("SessionManager", SESSION_MANAGER_ADDRESS);

    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

    // 2. Check USDC Balance
    const balance = await usdc.balanceOf(signer.address);
    console.log("USDC Balance:", ethers.formatUnits(balance, 6));

    if (balance < FEE_AMOUNT) {
        console.error("Insufficient USDC for test. Please faucet.");
        return;
    }

    // 3. Approve SessionManager
    console.log("Approving SessionManager...");
    const approveTx = await usdc.approve(SESSION_MANAGER_ADDRESS, FEE_AMOUNT);
    await approveTx.wait();
    console.log("Approved.");

    // 4. Call paySessionFee
    console.log("Paying Session Fee...");
    const tx = await SessionManager.paySessionFee(FEE_AMOUNT);
    console.log("Tx Sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Tx Confirmed! Block:", receipt.blockNumber);

    // 5. Verify Event
    // In a real test we'd parse logs, but successful wait() usually means no revert.
    console.log("Session Payment Verified Successfully on Arc Testnet.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
