//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract FarmCoin is ERC20, Ownable {

    // To match USDC's decimals
    uint8 public tokenDecimals = 6;

    constructor(string memory name, string memory symbol, uint8 _tokenDecimals) ERC20(name, symbol) Ownable() {
        tokenDecimals = _tokenDecimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return tokenDecimals;
    }

    function mintToAddress(address target, uint amount) onlyOwner() external {
        _mint(target, amount);
    }

}
