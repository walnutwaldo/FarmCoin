const chai = require('chai');
const expect = chai.expect;

chai.use(require('chai-as-promised'));

const { ethers } = require("hardhat");

describe("FarmCoin", function () {
  it("Should report the right owner", async function () {
    const [signer] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("FarmCoin");
    const instance = await factory.deploy();
    await instance.deployed();

    const owner = await instance.owner();
    expect(owner).to.equal(signer.address);
  });
  it("Should allow minting to the owner", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("FarmCoin");
    const instance = await factory.deploy();
    await instance.deployed();

    await instance.mintToAddress(owner.address, 1000);
    expect(await instance.balanceOf(owner.address)).to.equal(1000);

    await instance.mintToAddress(addr1.address, 1000);
    expect(await instance.balanceOf(addr1.address)).to.equal(1000);
  });
  it("Should not mint to non-owners", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("FarmCoin");
    const instance = await factory.deploy();
    await instance.deployed();

    const f1 = async() => await instance.connect(addr1).mintToAddress(addr1.address, 1000);
    await expect(f1()).to.be.rejectedWith(Error);

    const f2 = async() => await instance.connect(addr1).mintToAddress(owner.address, 1000);
    await expect(f2()).to.be.rejectedWith(Error);
  })
});
