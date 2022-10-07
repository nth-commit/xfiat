// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

interface IXFiatPegFactory {
    event PegCreated(string iso4217Code, address atAddress);

    /**
     * @notice Creates a XFiat peg contract
     * @param iso4217Code ISO 4217 currency code e.g. "USD": https://en.wikipedia.org/wiki/ISO_4217
     */
    function createPeg(string calldata iso4217Code) external;
}
