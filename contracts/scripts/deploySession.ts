import { ethers } from "hardhat";

async function main() {
    const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

    console.log("Deploying SessionManager with USDC Address:", USDC_ADDRESS);

    const SessionManager = await ethers.getContractFactory("SessionManager");
    const sessionManager = await SessionManager.deploy(USDC_ADDRESS);

    await sessionManager.waitForDeployment();

    const address = await sessionManager.getAddress();

    console.log(`SessionManager deployed to: ${address}`);
    console.log("Ensure you add this address to your frontend .env file as VITE_SESSION_CONTRACT_ADDRESS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
