pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./IStakeController.sol";

/**
 * General-purpose contract for staking.
 *
 * TODO: Currently this uses our own design. We should look at existing staking
 * contract designs and EIPs to determine if those are suitable.
 *
 * TODO: Could track the time at which stakes are added to enable controls
 * based on lock-up periods.
 *
 * TODO: Implement increaseStakeFor and decreaseStakeFor.
 */


contract Staking {
  using SafeMath for uint256;

  // Key is (token, stakeController, owner).
  // Balances can be viewed by calling `contract.balances(token, stakeController, owner)`.
  mapping(address => mapping(address => mapping(address => uint256))) public balances;

  event StakeChanged(
    address indexed token,
    address indexed stakeController,
    address indexed owner,
    uint256 amount
  );

  function increaseStake(
    address token,
    address stakeController,
    uint256 amount
  )
    external
  {
    // Redundant require for debuggability.
    require(
      IERC20(token).allowance(msg.sender, address(this)) >= amount,
      "Staking#increaseStake: Insufficient allowance."
    );

    uint256 initialBalance = balances[token][stakeController][msg.sender];
    uint256 newBalance = initialBalance.add(amount);
    balances[token][stakeController][msg.sender] = newBalance;

    IERC20(token).transferFrom(msg.sender, address(this), amount);

    emit StakeChanged(
      token,
      stakeController,
      msg.sender,
      newBalance
    );
  }

  function decreaseStake(
    address token,
    address stakeController,
    uint256 amount
  )
    external
  {
    uint256 initialBalance = balances[token][stakeController][msg.sender];
    uint256 newBalance = initialBalance.sub(amount);
    balances[token][stakeController][msg.sender] = newBalance;

    require(
      IStakeController(stakeController).minimumStake(token, msg.sender) <= newBalance,
      "Staking#decreaseStake: Cannot decrease below the controller minimum."
    );

    IERC20(token).transfer(msg.sender, amount);

    emit StakeChanged(
      token,
      stakeController,
      msg.sender,
      newBalance
    );
  }
}
