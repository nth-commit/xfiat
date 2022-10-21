// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./XFiatPegToken.sol";

interface IXFiatPeg {
    struct TrustedReserve {
        IERC20 token;
        uint8 decimals;
        uint256 limit;
    }

    event TrustedReserveAuthorized(address tokenAddress);

    error NotImplemented(string message);
    error ReserveAlreadyAuthorizedError();
    error ReserveNotAuthorizedError();
    error ERC20ValidationError_Contract();
    error ERC20ValidationError_Decimals();
}

contract XFiatPeg is IXFiatPeg, Ownable {
    string public iso4217Code;
    XFiatPegToken public pegToken;
    mapping(address => TrustedReserve) public trustedReserves;

    constructor(string memory _iso4217Code) {
        iso4217Code = _iso4217Code;
        pegToken = new XFiatPegToken(_iso4217Code);
    }

    function authorizeTrustedReserve(address token, uint256 limit)
        external
        onlyOwner
    {
        if (hasAuthorizedTrustedReserve(token))
            revert ReserveAlreadyAuthorizedError();
        if (Address.isContract(token) == false)
            revert ERC20ValidationError_Contract();

        ERC20 _token = ERC20(token);
        uint8 decimals = getTokenDecimals(_token);

        trustedReserves[token] = TrustedReserve({
            token: _token,
            limit: limit,
            decimals: decimals
        });
        emit TrustedReserveAuthorized(token);
    }

    function deposit(address token, uint256 amountIn) external {
        // @todo Add slippage parameter "minAmountOut"
        if (hasAuthorizedTrustedReserve(token) == false)
            revert ReserveNotAuthorizedError();

        address depositor = msg.sender;
        unsafe_acceptReserveToken(token, depositor, amountIn);
        pegToken.mint(depositor, amountIn);
    }

    function hasAuthorizedTrustedReserve(address token)
        internal
        view
        returns (bool)
    {
        return address(trustedReserves[token].token) != address(0);
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

    function unsafe_acceptReserveToken(
        address token,
        address depositor,
        uint256 amountIn
    ) internal {
        SafeERC20.safeTransferFrom(
            trustedReserves[token].token,
            depositor,
            address(this),
            amountIn
        );
    }
}
