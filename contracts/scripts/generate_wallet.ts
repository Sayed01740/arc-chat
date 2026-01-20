import { ethers } from "hardhat";

async function main() {
    const wallet = ethers.Wallet.createRandom();
    console.log("\n--- NEW WALLET CREDENTIALS ---");
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log(`Mnemonic: ${wallet.mnemonic?.phrase}`);
    console.log("------------------------------\n");
    console.log("IMPORTANT: Save these credentials securely. The Private Key should replace the compromised one in your .env file.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
