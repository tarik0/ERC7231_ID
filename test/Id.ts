import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC7231 ID", function () {
    const NAME = "ERC7231";
    const SYMBOL = "ID";

    async function deployERC7231Fixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        const ERC7231 = await ethers.getContractFactory("UserID");
        const erc7231 = await ERC7231.deploy(NAME, SYMBOL);
        await erc7231.waitForDeployment();
        await erc7231.connect(owner).mint();

        return { erc7231, owner, otherAccount };
    }

    it("should deploy ERC7231", async function () {
        const { erc7231 } = await loadFixture(deployERC7231Fixture);
        expect(await erc7231.getAddress()).to.be.properAddress;
    });

    it("should allow setting and retrieving an ID", async function () {
        const { erc7231, owner } = await loadFixture(deployERC7231Fixture);

        const tokenId = ethers.toBigInt(ethers.keccak256(owner.address));
        const multiUserIDsHash = "0xa5b9d60f32436310afebcfda832817a68921beb782fabf7915cc0460b443116a";
        await expect(erc7231.connect(owner).setIdentitiesRoot(tokenId, multiUserIDsHash))
            .to.emit(erc7231, "SetIdentitiesRoot")
            .withArgs(tokenId, multiUserIDsHash);

        const multiUserIDsRoot = await erc7231.getIdentitiesRoot(tokenId);
        expect(multiUserIDsHash).to.equal(multiUserIDsRoot);
        expect(await erc7231.getIdentitiesRoot(tokenId)).to.equal(multiUserIDsHash);
    });

    it("should verify the ID binding", async function () {
        const { erc7231, owner } = await loadFixture(deployERC7231Fixture);

        const tokenId = ethers.toBigInt(ethers.keccak256(owner.address));
        const multiUserIDs = [
            {
                userID: "openID2:steam:a000000000000000000000000000000000000000000000000000000000000001",
                verifierUri1: "https://carv.io/verify/steam/a000000000000000000000000000000000000000000000000000000000000001",
                memo: "memo1",
            },
            {
                userID: "did:polgyonId:b000000000000000000000000000000000000000000000000000000000000002",
                verifierUri1: "https://carv.io/verify/steam/b000000000000000000000000000000000000000000000000000000000000002",
                memo: "memo1",
            },
        ];

        const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(multiUserIDs)));
        const dataHashBin = ethers.toBeArray(dataHash);
        const ethHash = ethers.hashMessage(dataHashBin);

        const signature = await owner.signMessage(dataHashBin);
        await erc7231.connect(owner).setIdentitiesRoot(tokenId, ethHash);

        const userIDs = multiUserIDs.map((obj) => obj.userID);
        const result = await erc7231.verifyIdentitiesBinding(tokenId, await owner.getAddress(), userIDs, ethHash, signature);
        expect(result).to.equal(true);
    });
});