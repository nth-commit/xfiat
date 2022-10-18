// SPDX-License-Identifier: GNU GPLv3
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

/**
 * A contract for intializing a new reserve currency. This process is kicked off by an applicant, such as a stablecoin
 * issuer, who might want their token to be used as reserve currency for the protocol. The initialization is a means to
 * a) establish a baseline liquidity, so that the protocol can defend against mis-pricings due to low initial liquidity
 * and b) trial the currency without risk to the protocol (risk is taken on by applicant through collateral).
 *
 * Once the reserve is approved for funding, then it goes into the process described:
 *
 * 1. Anyone is able to add liquidity (or remove liquidity they previously added) until the target liquidity is met.
 * 2. Once the liquidity target is met, the amount is matched against the (previously trusted) collateral by the
 *    applicant at the expected price (for example, if this is a reserve for XUSD, then the expected price = $1).
 * 3. The accumulated tokens are transferred into a liquidity pool that anyone is able to interact with and locked
 *    there for a set amount of time (e.g. 7 days). Because anyone can swap either token, then we can make observations
 *    about price of the applicant currency. This is the "exposure period", because the currency is exposed to the
 *    market.
 * 4. If the token meets price guarantees over the exposure period, then the tokens are transferred into the peg
 *    contract, become part of the reserves, and liquidity providers are distributed their equivalent contribution in
 *    the peg token (e.g. XUSD), as well as some rewards. If the price guarantees are not met, then liquidity providers
 *    are refunded their tokens, and the collateral is transferred to governance for arbitration. The arbitration
 *    process is described in detail elsewhere, but the collateral tokens are subject to being slashed or refunded to
 *    liquidity providers, depending on the conditions of failure.
 *
 * Governance are able to cancel the process at any time. This refunds all liquidity providers and releases collateral.
 */
contract ReserveFunding is Ownable {
    enum State {
        LiquidityAccumulating,
        LiquidityLocked,
        LiquidityExposed,
        Completed,
        Cancelled
    }

    State public state = State.LiquidityAccumulating;

    IERC20 public token;
    uint256 public targetLiquidity;
    IUniswapV3Factory public uniswapFactory;

    uint256 public totalLiquidity = 0;
    mapping(address => uint256) public liquidity;

    constructor(
        address _token,
        uint256 _targetLiquidity,
        IUniswapV3Factory _uniswapFactory
    ) {
        targetLiquidity = _targetLiquidity;
        token = IERC20(_token);
        uniswapFactory = _uniswapFactory;
    }

    modifier inState1(State state1) {
        require(state == state1);
        _;
    }
    modifier inState2(State state1, State state2) {
        require(state == state1 || state == state2);
        _;
    }

    function addLiquidity(uint256 amount)
        external
        inState1(State.LiquidityAccumulating)
    {
        uint256 remainingLiquidity = targetLiquidity - totalLiquidity;
        uint256 addedLiquidity = Math.min(remainingLiquidity, amount);

        SafeERC20.safeTransferFrom(
            token,
            msg.sender,
            address(this),
            addedLiquidity
        );

        totalLiquidity += addedLiquidity;
        liquidity[msg.sender] += addedLiquidity;

        if (shouldBeLocked()) {
            state = State.LiquidityLocked;
        }
    }

    function clearLiquidity()
        external
        inState2(State.LiquidityAccumulating, State.Cancelled)
    {
        uint256 contributedLiquidity = liquidity[msg.sender];

        liquidity[msg.sender] = 0;
        totalLiquidity -= contributedLiquidity;

        SafeERC20.safeApprove(token, address(this), contributedLiquidity);

        SafeERC20.safeTransferFrom(
            token,
            address(this),
            msg.sender,
            contributedLiquidity
        );
    }

    function cancelLiquidityAccumulating()
        external
        onlyOwner
        inState1(State.LiquidityAccumulating)
    {
        state = State.Cancelled;
    }

    function resumeLiquidityAccumulating()
        external
        onlyOwner
        inState1(State.Cancelled)
    {
        if (shouldBeLocked()) {
            state = State.LiquidityLocked;
        } else {
            state = State.LiquidityAccumulating;
        }
    }

    function exposeLiquidity() external inState1(State.LiquidityLocked) {
        // Timelock for X

        state = State.LiquidityExposed;
    }

    function cancelLiquidityExposed()
        external
        onlyOwner
        inState1(State.LiquidityExposed)
    {
        // Withdraw all liquidity from pool
        // Transfer liquidity back to contributors
        // Transfer pair token liquidity back to contributors

        state = State.Cancelled;
    }

    function shouldBeLocked() internal view returns (bool) {
        return totalLiquidity >= targetLiquidity;
    }
}
