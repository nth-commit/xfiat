// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract XFiatPeg is Ownable {
    address public factory;
    string public iso4217Code;

    constructor(address _factory, string memory _iso4217Code) {
        factory = _factory;
        iso4217Code = _iso4217Code;
    }
}
