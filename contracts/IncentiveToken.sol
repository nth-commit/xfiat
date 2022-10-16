// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * The XFiat incentive token (XINC). Used for protocol governance, and has many active roles in the operations of the
 * protocol itself. The protocol is programmed to buy a small amount of XINC under healthy conditions - because of this
 * the total value of XINC is expected to increase over time. The exact distribution (monetary policy) of that value is
 * TBD. For now, governance can mint new tokens without any checks or balances, though this will not be the case in the
 * initial working version.
 */
contract IncentiveToken is ERC20, Ownable {
    constructor() ERC20("XFiat Incentive Token", "XINC") {}

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }
}
