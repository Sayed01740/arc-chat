import { ethers } from "hardhat";

async function main() {
    const helloArchitect = await ethers.deployContract("HelloArchitect");

    await helloArchitect.waitForDeployment();

    console.log(
        `HelloArchitect deployed to ${await helloArchitect.getAddress()}`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
