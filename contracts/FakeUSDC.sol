pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract FakeUSDC is ERC20 {

    uint8 public tokenDecimals = 18;

    constructor(string memory name, string memory symbol, uint8 _decimals) ERC20(name, symbol) {
        tokenDecimals = _decimals;
        _mint(msg.sender, 10 ** (12 + tokenDecimals));
    }

    function decimals() public view virtual override returns (uint8) {
        return tokenDecimals;
    }

    function gimmeMoney() external {
        _mint(msg.sender, 10 ** (12 + tokenDecimals));
    }

}