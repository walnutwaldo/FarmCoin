require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

GOERLI_HTTP_ADDRESS = "https://eth-goerli.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      },
      {
        version: "0.6.12",
        settings: {},
      },
    ],
  },
  networks: {
    goerli: {
      url: GOERLI_HTTP_ADDRESS,
      accounts: [PRIVATE_KEY]
    }
  }
};
