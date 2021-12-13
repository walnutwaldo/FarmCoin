// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const jsonfile = require('jsonfile');

const DECIMALS = 6;

let usdcAddress = "0x";
const USDC_ABI = jsonfile.readFileSync("artifacts/contracts/FakeUSDC.sol/FakeUSDC.json").abi;

let farmAddress = "0x";
const FARM_ABI = jsonfile.readFileSync("artifacts/contracts/Farm.sol/Farm.json").abi;

let farmCoinAddress = "0x";
const FARM_COIN_ABI = jsonfile.readFileSync("artifacts/contracts/FarmCoin.sol/FarmCoin.json").abi;

let signer = null;

let usdcContract;
let farmContract;
let farmCoinContract

const options = { gasLimit: 10 ** 6 };

async function makeFiatContract() {
    const addr = signer.address;

    const usdcFactory = await hre.ethers.getContractFactory("FakeUSDC");
    usdcContract = await usdcFactory.deploy("US Dollar Coin", "USDC", DECIMALS);
    await usdcContract.deployed();

    usdcAddress = usdcContract.address;
    console.log("Fiat contract deployed to:", usdcContract.address);
    console.log(`Minted ${await usdcContract.balanceOf(addr) / (10.0 ** DECIMALS)} to ${addr}`);
}

async function makeContract() {
    const factory = await hre.ethers.getContractFactory("Farm");
    farmContract = await factory.deploy(usdcAddress, "FarmCoin", "FRMC", DECIMALS);
    await farmContract.deployed();

    farmAddress = farmContract.address;
    console.log("Farm deployed to:", farmContract.address);

    farmCoinAddress = await farmContract.farmCoinContract();
    farmCoinContract = new hre.ethers.Contract(farmCoinAddress, FARM_COIN_ABI, signer);
}

async function testDeposit(amt, lock) {
    await farmContract.deposit(amt, lock, options);
    console.log(`\tMade deposit \$${amt / (10.0 ** DECIMALS)} (${lock} month lock)`);
}

async function testWithdraw(amt) {
    const usdcBefore = await usdcContract.balanceOf(signer.address);
    await farmContract.withdraw(amt, options);
    console.log(`\tMade withdrawal of \$${amt / (10.0 ** DECIMALS)}`);
    const usdcAfter = await usdcContract.balanceOf(signer.address);
    console.log(`\tWithdrew ${(usdcAfter - usdcBefore) / (10.0 ** DECIMALS)} USDC`);
}

async function testHarvest() {
    const farmcoinBefore = await farmCoinContract.balanceOf(signer.address);
    await farmContract.harvest();
    const farmcoinAfter = await farmCoinContract.balanceOf(signer.address);
    console.log(`\tHarvested ${(farmcoinAfter - farmcoinBefore) / (10.0 ** DECIMALS)} Farmcoin`);
}

async function wait(timeout) {
    console.log(`\t** Jumping ahead ${timeout} seconds (${timeout / (30 * 24 * 60 * 60.0)} months) **`);
    return hre.network.provider.request({
        method: "evm_increaseTime",
        params: [timeout],
    });
}

async function testDepositAndWithdraw(amt, lock, timeout) {
    console.log(`[Testing deposit of \$${amt / (10.0 ** DECIMALS)} (${lock} month lock)]`);
    await testDeposit(amt, lock);
    await wait(timeout);
    await testWithdraw(amt);
    await testHarvest();
}

const MONTH = 60 * 60 * 24 * 30;

async function interactWithContract() {
    console.log(`Interacting using address ${signer.address}`);

    // await testDepositAndWithdraw(10 ** 8, 0, 1000);
    // await testDepositAndWithdraw(10 ** 8, 0, 10 ** 6);
    // await testDepositAndWithdraw(10 ** 8, 0, 4 * (10 ** 7));
    // await testDepositAndWithdraw(10 ** 8, 0, 10 ** 9);
    // await testDepositAndWithdraw(10 ** 8, 6, 1000);
    // await testDepositAndWithdraw(10 ** 8, 6, 10 ** 6);
    // await testDepositAndWithdraw(10 ** 8, 6, 4 * (10 ** 7));
    // await testDepositAndWithdraw(10 ** 8, 6, 10 ** 9);
    // await testDepositAndWithdraw(10 ** 8, 12, 1000);
    // await testDepositAndWithdraw(10 ** 8, 12, 10 ** 6);
    // await testDepositAndWithdraw(10 ** 8, 12, 4 * (10 ** 7));
    // await testDepositAndWithdraw(10 ** 8, 12, 10 ** 9);

    await testDeposit(1000 * (10 ** DECIMALS), 0);
    await wait(3 * MONTH);
    await testDeposit(1000 * (10 ** DECIMALS), 6);
    await testWithdraw(1500 * (10 ** DECIMALS));
    await testHarvest();
}

async function setAllowance() {
    const options = { gasLimit: 10 ** 6 };

    console.log(`Interacting using address ${signer.address}`);
    await usdcContract.increaseAllowance(farmAddress, 10 ** 10, options);
    console.log("Made allowance");

    console.log(`Current farm allowance: \$${await usdcContract.allowance(signer.address, farmAddress, options) * 0.000001}`);
}

async function main() {
    [signer] = await hre.ethers.getSigners();
    await makeFiatContract();
    await makeContract();
    await setAllowance();
    await interactWithContract();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
