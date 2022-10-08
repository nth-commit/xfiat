// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IXFiatPeg {
    struct TrustedReserve {
        address tokenAddress;
        uint8 decimals;
        uint256 limit;
    }

    error NotImplemented(string reason);
    error ReserveExistedError();
    error ERC20ValidationError_Contract();
    error ERC20ValidationError_Decimals();
}

contract XFiatPeg is IXFiatPeg, Ownable {
    address public factory;
    string public iso4217Code;
    XFiatPegToken public pegToken;
    mapping(address => TrustedReserve) trustedReserves;

    constructor(address _factory, string memory _iso4217Code) {
        factory = _factory;
        iso4217Code = _iso4217Code;
        pegToken = new XFiatPegToken(_iso4217Code);
    }

    function authorizeTrustedReserve(address token, uint256 limit)
        external
        onlyOwner
    {
        if (trustedReserves[token].tokenAddress != address(0))
            revert ReserveExistedError();
        if (Address.isContract(token) == false)
            revert ERC20ValidationError_Contract();

        ERC20 tokenRef = ERC20(token);
        uint8 decimals = getTokenDecimals(tokenRef);

        trustedReserves[token] = TrustedReserve({
            tokenAddress: token,
            limit: limit,
            decimals: decimals
        });
    }

    function getTokenDecimals(ERC20 tokenRef) internal view returns (uint8) {
        try tokenRef.decimals() returns (uint8 decimals) {
            if (decimals != 18) {
                revert NotImplemented(
                    "Reserves with decimals != 18 is not supported"
                );
            }
            return decimals;
        } catch {
            revert ERC20ValidationError_Decimals();
        }
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
