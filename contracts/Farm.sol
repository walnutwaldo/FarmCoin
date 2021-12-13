pragma solidity ^0.8.0;

// For debugging
import 'hardhat/console.sol';

import './FarmCoin.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

// Functionality:
// - A contract that accepts USDC deposits and rewards the user with FarmCoins
// - If there is no lock up period, the user should earn 10% APY in FarmCoin
// - For a six month lock up, the user should earn 20% APY in FarmCoin
// - For a 1 year lock up, the user should earn 30% APY in FarmCoin

interface USDC {

    function transferFrom(address from, address to, uint256 value) external;
    function transfer(address to, uint256 value) external;
    function balanceOf(address account) external view returns (uint256);

}

contract Farm is Ownable {

    using SafeMath for uint256;
    using SafeMath for uint32;
    using SafeMath for uint16;

    FarmCoin public farmCoinContract;
    USDC public usdcContract;

    struct Lockup {
        uint amount;
        uint startTime;
        uint unlockTime;
        uint rate;
    }

    // Lockup rates in base points (100-ths of a percentage)
    mapping(uint16 => uint32) public lockupRates;

    // Index 0: No lockup mapping
    // Index 1: Lockup for 6 months
    // Index 2: Lockup for 12 months
    mapping(address => uint) unlockedDeposits;
    mapping(address => Lockup[]) lockedDeposits;
    mapping(address => uint) totalLocked;

    mapping(address => uint) farmCoinOwed;
    mapping(address => uint) lastUpdated;

    address[] allAddresses;
    // Express in base points (100-ths of a percentage)
    uint16 public withdrawFee;

    constructor(address usdc_address, string memory name, string memory symbol, uint8 decimals) Ownable() {
        farmCoinContract = new FarmCoin(name, symbol, decimals);
        usdcContract = USDC(usdc_address);

        lockupRates[0] = 1000;
        lockupRates[6] = 2000;
        lockupRates[12] = 3000;

        withdrawFee = 1000;
    }

    function deposit(uint amount, uint16 period) external {
        require(lockupRates[period] > 0, "Lockup option unavailable for given period.");
        require(usdcContract.balanceOf(msg.sender) >= amount, "Insufficient USDC balance.");

        uint256 nowT = block.timestamp;

        if (lastUpdated[msg.sender] == 0) {
            // This user has made their first deposit
            allAddresses.push(msg.sender);
        }

        usdcContract.transferFrom(msg.sender, address(this), amount);

        _update(msg.sender);

        if (period == 0) {
            unlockedDeposits[msg.sender] = unlockedDeposits[msg.sender].add(amount);
        } else {
            Lockup memory lockupRecord = Lockup({
                amount: amount,
                startTime: nowT,
                unlockTime: nowT.add(uint(period) * 30 days),
                rate: lockupRates[period]
            });
            lockedDeposits[msg.sender].push(lockupRecord);
        }

        totalLocked[msg.sender] = totalLocked[msg.sender].add(amount);
    }

    function harvest() external {
        _update(msg.sender);
        farmCoinContract.mintToAddress(msg.sender, farmCoinOwed[msg.sender]);
        farmCoinOwed[msg.sender] = 0;
    }

    function withdraw(uint amount) external {
        require(amount <= totalLocked[msg.sender], "Amount exceeds total deposits.");
        _update(msg.sender);

        uint amountAfterFees = 0;
        uint amountWithdrawnEarly = 0;

        if (amount <= unlockedDeposits[msg.sender]) {
            amountAfterFees = amount;
            unlockedDeposits[msg.sender] = unlockedDeposits[msg.sender].sub(amount);
        } else {
            amountAfterFees = unlockedDeposits[msg.sender];
            amount = amount.sub(amountAfterFees);
            unlockedDeposits[msg.sender] = 0;

            Lockup[] storage deposits = lockedDeposits[msg.sender];
            while (deposits.length > 0) {
                Lockup storage record = deposits[deposits.length - 1];
                if (amount < record.amount) {
                    record.amount = record.amount.sub(amount);
                    amountWithdrawnEarly = amountWithdrawnEarly.add(amount);
                    amount = 0;
                    break;
                } else {
                    amountWithdrawnEarly = amountWithdrawnEarly.add(record.amount);
                    amount = amount.sub(record.amount);
                    deposits.pop();
                }
            }

            amountAfterFees += amountWithdrawnEarly.mul(uint(10000).sub(withdrawFee)).div(10000);
        }
        totalLocked[msg.sender] = totalLocked[msg.sender].sub(amount);

        usdcContract.transfer(msg.sender, amountAfterFees);
    }

    function _update(address account) internal {
        uint lastTime = lastUpdated[account];

        uint256 nowT = block.timestamp;

        // To have higher accuracy, we calculate the amount owed * 10000 * seconds per year
        uint newOwed = unlockedDeposits[account].mul(nowT.sub(lastTime)).mul(lockupRates[0]);

        Lockup[] storage deposits = lockedDeposits[account];

        // The system of using both i and j is to remove records that have already passed their lockup period
        for (uint i = 0; i < deposits.length;) {
            Lockup storage record = deposits[i];
            if (record.unlockTime <= nowT) {
                unlockedDeposits[account] = unlockedDeposits[account].add(record.amount);
                // Add amount from lockup period (higher rate)
                newOwed = newOwed.add(record.amount.mul(record.unlockTime.sub(record.startTime)).mul(record.rate));
                // Add amount from after lockup period (base rate)
                newOwed = newOwed.add(record.amount.mul(nowT.sub(record.unlockTime)).mul(lockupRates[0]));

                // Remove this element of the list
                deposits[i] = deposits[deposits.length - 1];
                deposits.pop();

                // Since we swapped this with the element at the end of the list we don't want to increment i
            } else {
                i++;
            }
        }

        // Using 360 days per year to conform with the 30 day definition of a month elsewhere in the contract
        farmCoinOwed[account] = farmCoinOwed[account].add(newOwed.div(10000 * 12 * 30 days));
        lastUpdated[account] = nowT;
    }

    function getTotalLocked() external view returns(uint256) {
        return totalLocked[msg.sender];
    }

    function setUSDCAddress(address newAddress) onlyOwner() external {
        usdcContract = USDC(newAddress);
    }

    // TODO: This just naively sets the lockup rate but the best way to do this would be to have a
    // history of lockup rate changes so there is not a bunch of computation done at once but instead
    // distributed among the users. However, I don't implement this here for now because of the complexity.
    function adjustLockupRate(uint16 lockupPeriod, uint32 basePoints) onlyOwner() external {
        for (uint i = 0; i < allAddresses.length; i++) {
            _update(allAddresses[i]);
        }
        lockupRates[lockupPeriod] = basePoints;
    }

    function adjustWithdrawFee(uint16 newWithdrawFee) onlyOwner() external {
        withdrawFee = newWithdrawFee;
    }

}
