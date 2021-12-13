// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const DECIMALS = 6;

async function makeContract() {
    const [signer] = await hre.ethers.getSigners();
    const addr = signer.address;

    const usdcFactory = await hre.ethers.getContractFactory("FakeUSDC");
    const contract = await usdcFactory.deploy("US Dollar Coin", "USDC", DECIMALS);
    await contract.deployed();

    console.log("Fiat contract deployed to:", contract.address);
    console.log(`Minted ${await contract.balanceOf(addr) / (10.0 ** DECIMALS)} to ${addr}`);
}

async function main() {
    await makeContract();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
