import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balance for address:", deployer.address);

    // Use Hardhat's provider wrapper
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
    console.error("Error checking balance:", error);
    process.exitCode = 1;
});
