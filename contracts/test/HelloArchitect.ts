import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("HelloArchitect", function () {
    async function deployHelloArchitectFixture() {
        const HelloArchitect = await ethers.getContractFactory("HelloArchitect");
        const helloArchitect = await HelloArchitect.deploy();

        return { helloArchitect };
    }

    describe("Deployment", function () {
        it("Should set the right greeting", async function () {
            const { helloArchitect } = await loadFixture(deployHelloArchitectFixture);

            expect(await helloArchitect.getGreeting()).to.equal("Hello Architect!");
        });
    });

    describe("Set Greeting", function () {
        it("Should set a new greeting", async function () {
            const { helloArchitect } = await loadFixture(deployHelloArchitectFixture);
            const newGreeting = "Hello World!";

            await helloArchitect.setGreeting(newGreeting);
            expect(await helloArchitect.getGreeting()).to.equal(newGreeting);
        });

        it("Should emit an event on greeting change", async function () {
            const { helloArchitect } = await loadFixture(deployHelloArchitectFixture);
            const newGreeting = "Hello World!";

            await expect(helloArchitect.setGreeting(newGreeting))
                .to.emit(helloArchitect, "GreetingChanged")
                .withArgs(newGreeting);
        });
    });
});
