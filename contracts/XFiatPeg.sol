// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract XFiatPeg is Ownable {
    address public factory;
    string public iso4217Code;
    XFiatPegToken public pegToken;

    constructor(address _factory, string memory _iso4217Code) {
        factory = _factory;
        iso4217Code = _iso4217Code;
        pegToken = new XFiatPegToken(_iso4217Code);
    }
}

contract XFiatPegToken is ERC20, Ownable {
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
}
