// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract XFiatPegToken is ERC20, Ownable, ReentrancyGuard {
    error FeeRateOutOfBounds();

    uint256 public constant feeResolution = 10**5; // 0.001%
    uint256 public feeRate = 0;

    constructor(string memory iso4217Code)
        ERC20(
            string.concat("XFiat ", iso4217Code, " Peg"),
            string.concat("X", iso4217Code)
        )
    {}

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function transfer(address account, uint256 amount)
        public
        override
        returns (bool)
    {
        uint256 feeAmount = calculateFee(msg.sender, account, amount);
        return
            super.transfer(address(this), feeAmount) &&
            super.transfer(account, amount - feeAmount);
    }

    function setFeeRate(uint256 _feeRate) external nonReentrant onlyOwner {
        if (_feeRate > feeResolution) revert FeeRateOutOfBounds();
        feeRate = _feeRate;
    }

    function collectFee(address recipient, uint256 requestedAmount)
        external
        nonReentrant
        onlyOwner
    {
        _transfer(address(this), recipient, requestedAmount);
    }

    function calculateFee(
        address sender,
        address receiver,
        uint256 amount
    ) public view returns (uint256) {
        if (sender == owner()) return 0;
        if (receiver == owner()) return 0;
        uint256 feeParts = amount / feeResolution;
        return feeParts * feeRate;
    }
}
