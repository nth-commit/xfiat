// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IXFiatPegFactory.sol";
import "./XFiatPeg.sol";

contract XFiatPegFactory is Ownable, IXFiatPegFactory {
    mapping(string => address) public pegs;

    // @inheritdoc IXFiatPegFactory
    function createPeg(string calldata iso4217Code) external onlyOwner {
        require(pegs[iso4217Code] == address(0), "Peg already existed");

        XFiatPeg peg = new XFiatPeg(iso4217Code);

        // Transfer ownership to the owner of the factory
        peg.transferOwnership(this.owner());

        address pegAddress = address(peg);
        pegs[iso4217Code] = pegAddress;
        emit PegCreated(iso4217Code, pegAddress);
    }
}
