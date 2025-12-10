import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("----------------------------------------------------");
    console.log("Deployer Address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);

    // Robust formatting (v5 vs v6)
    let formattedBalance;
    if ((ethers as any).formatEther) {
        formattedBalance = (ethers as any).formatEther(balance); // v6
    } else if ((ethers as any).utils && (ethers as any).utils.formatEther) {
        formattedBalance = (ethers as any).utils.formatEther(balance); // v5
    } else {
        formattedBalance = balance.toString(); // Fallback
    }

    console.log("Balance on this network:", formattedBalance, "ETH/Gas Token");
    console.log("----------------------------------------------------");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
