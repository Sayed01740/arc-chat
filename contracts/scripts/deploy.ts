import { ethers } from "hardhat";

async function main() {
    const Identity = await ethers.getContractFactory("IdentityRegistry");
    const identity = await Identity.deploy();
    // Using waitForDeployment() instead of deployed() for Ethers v6 compatibility
    await identity.waitForDeployment();
    // Using getAddress() instead of .address for Ethers v6 compatibility
    console.log("IdentityRegistry deployed to:", await identity.getAddress());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
