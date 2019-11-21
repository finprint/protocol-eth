pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


/**
 * @title FinprintToken
 *
 * This contract defines the Finprint ERC-20 token used to run the Finprint protocol.
 */
contract FinprintToken is
    ERC20,
    ERC20Detailed
{

  uint8 public constant DECIMALS = 18;
  /* solium-disable-next-line mixedcase */
  uint256 public INITIAL_SUPPLY = (10 ** 9) * (10 ** uint256(DECIMALS));

  constructor()
      public
      ERC20Detailed("Finprint Protocol Token", "FPT", DECIMALS)
  {
    _mint(msg.sender, INITIAL_SUPPLY);
  }
}
