pragma solidity ^0.5.7;

/**
 * Interface for a contract that makes use of a stake held by the Staking contract.
 */
interface IStakeController {
  function minimumStake(address token, address owner) external view returns (uint256);
}
