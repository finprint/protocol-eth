pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import "openzeppelin-eth/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "solidity-BigNumber/contracts/BigNumber.sol";
import "zos-lib/contracts/Initializable.sol";
import "./IStakeController.sol";
import "./Staking.sol";
import { Challenge } from "./Challenge.sol";

/**
 * @title Lockbox
 *
 * This contract is used to create lockboxes and manage requests to read from
 * them, in accordance with the Finprint protocol.
 *
 * The contract is Pausible so that functionality can be disabled to protect
 * users in case the contract is compromised or is undergoing a migration.
 *
 * WARNING: This is a ZeppelinOS upgradable contract. Be careful that you do not
 * disrupt the storage layout when updating the variables used by the contract.
 * In particular, existing variables should not be removed and should not have
 * their types changed. The variable order must not be changed, and new
 * variables must be added below all existing declarations.
 *
 * The base contracts and the order in which they are declared must not be
 * changed. Variables must not be added to base contracts.
 *
 * See https://docs.zeppelinos.org/docs/writing_contracts.html for more info.
 */


contract Lockbox is Initializable, Pausable, IStakeController {
  using BigNumber for BigNumber.instance;
  using SafeMath for uint256;

  // Note: The storage layout for enums is not checked by ZeppelinOS.
  // However, the smallest uint in solidity is uint8 and the storage layout should not be affected
  // as long as we define no more than 256 different versions.
  //
  // See https://github.com/zeppelinos/zos/issues/113
  enum ProtocolVersion {
    master_RSA_0, // 0
    master_XOR_1 // 1
  }

  // The token used for staking and to pay all protocol fees.
  IERC20 public protocolToken;

  // The minimum stake that an address must hold to be added to the sharing group for a lockbox.
  uint256 public constant SHARING_GROUP_MIN_STAKE = 1000;

  // Since floats cannot be represented in Solidity, this is the precision constant
  // for any fraction calculations.
  uint256 public constant FRACTION_PRECISION = 10 ** 5;

  // Length of an unpadded secret share
  uint256 public constant SECRET_SHARE_LENGTH_BYTES = 136;


  /**
   * Sharing fee fraction.
   *
   * Each lockbox has a price, charged to the reader for opening a request.
   * This constant denotes the proportion of the price which is paid out to the
   * secret-sharing group. Each sharing group member receives an equal fraction
   * of this fee. The remaining fraction of the price is paid to the writer.
   *
   * A consumer reading their own lockbox is charged only the sharing fee,
   * not the full price.
   *
   * Denoted in thousandths of a percent.
   */
  uint256 public constant SHARING_FEE_FRACTION = 25000;

  // Tracks how many times the migrate() function was called.
  uint8 public migrationCount;

  /**
   * State for a request.
   *
   * Primary key: (lockboxId, readerAddress)
   *
   * The state of a request is one of the following:
   *  - NULL: This is the state if the request has never been opened.
   *    • Allowed operations: openRequest()
   *  - OPEN: This is the state if the request is open and waiting for one or
   *      more partial results to be posted.
   *    • Allowed operations: postResult()
   *  - FILLED: This is the state after all partial results have been posted.
   *    • Allowed operations: openRequest(), challengeResult()
   *  - CHALLENGED: This is the state after a result has been challenged.
   *    • Allowed operations: openRequest()
   */
  struct Request {
    uint256 price;
    bool exists;
    bool challenged;

    // Use an array instead of a mapping to avoid issues with duplicate members
    // in the sharing group. I haven't figured out an efficient way of detecting
    // duplicate values in an array in Solidity.
    bytes[] partialResults;

    // Storing the public key so challenged private keys can be verified.
    bytes[2] publicKey;
  }

  struct LockboxState {
    address writerAddress;
    address consumerAddress;
    uint256 price;
    address[] sharingGroup;
    mapping(address => Request) requests;
  }

  enum RequestStatus {
    NULL, // 0
    OPEN,
    FILLED,
    CHALLENGED
  }

  // Use `private` to disallow other smart contracts from directly querying lockbox state.
  mapping(uint256 => LockboxState) private lockboxes;

  uint256 public nextLockboxId;

  uint256 public constant MAX_MIGRATIONS = 10;

  // This is the max uint256 value. Used as a return value from indexOf().
  // Use `private` since this doesn't mean anything outside the smart contract.
  uint256 private constant INDEX_OF_NOT_FOUND = ~uint256(0);

  // Length in bytes of the hash within the secret.
  uint256 public constant SECRET_HASH_LENGTH = 32;

  // The contract used to hold token stake.
  Staking public stakingContract;

  //
  // UPGRADEABLE CONTRACT: End of storage declaration. Add new variables here^
  //
  // Constants do not using storage slots so they can be added anywhere (TODO: Verify.)
  //

  // The Initialized event should be emitted once, and only once, before any other event is emitted.
  event Initialized(address protocolToken, address stakingContract);

  // The Migrated event should be emitted exactly twice. The calls to migrate() should occur after
  // the call to initialize(), but before any other function is called.
  event Migrated(uint256 migratedLockboxCount, uint256 initialLockboxId);

  event LockboxCreated(
    ProtocolVersion protocolVersion,
    uint256 indexed lockboxId,
    address indexed writerAddress,
    address indexed consumerAddress,
    address[] sharingGroup
  );
  event LockboxUpdated(
    ProtocolVersion protocolVersion,
    uint256 indexed lockboxId,
    address indexed writerAddress,
    address indexed consumerAddress,
    bytes secretSharesCid
  );
  event RequestOpened(
    uint256 indexed lockboxId,
    address indexed readerAddress,
    uint256 requestPrice,
    uint256 signatureExpiration,
    bytes signature,
    bytes n,
    bytes e
  );
  event ResultPosted(
    uint256 indexed lockboxId,
    address indexed readerAddress,
    address indexed sharingGroupMember,
    bytes partialResult
  );
  event RequestFilled(
    uint256 indexed lockboxId,
    address indexed readerAddress
  );
  event PriceUpdated(
    uint256 indexed lockboxId,
    uint256 updatedPrice
  );
  event ResultChallenged(
    uint256 indexed lockboxId,
    address indexed readerAddress,
    bool won
  );

  /**
   * Initializer.
   *
   * Contracts using ZeppelinOS must not use constructors or initial values in
   * field declarations. They must use initializers instead.
   *
   * @param pauser            The address with permission to pause the contract.
   * @param _protocolToken    The ERC20 token used to pay all protocol fees.
   * @param _stakingContract  The contract used to hold token stake.
   */
  function initialize(address pauser, address _protocolToken, address _stakingContract)
    external
    initializer
  {
    require(
      pauser != address(0),
      "Lockbox#initialize: The pauser address must not be 0x0."
    );
    require(
      _protocolToken != address(0),
      "Lockbox#initialize: The protocolToken address must not be 0x0."
    );

    require(
      _stakingContract != address(0),
      "Lockbox#initialize: The stakingContract address must not be 0x0."
    );

    protocolToken = IERC20(_protocolToken);
    stakingContract = Staking(_stakingContract);
    nextLockboxId = 1;
    migrationCount = 0;

    // By convention, emit Initialized first, before all other events, e.g. PauserAdded.
    emit Initialized(_protocolToken, _stakingContract);

    Pausable.initialize(pauser);
  }

  /**
   * Create a lockbox.
   *
   * @param  protocolVersion       The protocol version.
   * @param  consumerAddress       The consumer who the lockbox is about.
   * @param  price                 Price to read the lockbox contents.
   * @param  secretSharesCid       CID for the secret shares.
   * @param  sharingGroup          Addresses of the secret-sharing group members.
   */
  function createLockbox(
    ProtocolVersion protocolVersion,
    address consumerAddress,
    uint256 price,
    bytes memory secretSharesCid,
    address[] memory sharingGroup
  )
    public // Use public instead of external due to ABIEncoderV2 not supporting all calldata arrays.
    whenNotPaused
  {
    require(
      sharingGroup.length > 0,
      "Lockbox#createLockbox: The sharingGroup list must have at least one member."
    );

    for (uint256 i = 0; i < sharingGroup.length; i++) {
      require(
        getStake(sharingGroup[i]) >= SHARING_GROUP_MIN_STAKE,
        "Lockbox#createLockbox: Every sharingGroup member must hold the minimum stake."
      );
    }

    // Overflow check for sharing fee calculation.
    price.mul(SHARING_FEE_FRACTION);

    uint256 lockboxId = nextLockboxId++;
    address writerAddress = msg.sender;

    lockboxes[lockboxId] = LockboxState({
      writerAddress: writerAddress,
      consumerAddress: consumerAddress,
      price: price,
      sharingGroup: sharingGroup
    });

    emit LockboxCreated(
      protocolVersion,
      lockboxId,
      writerAddress,
      consumerAddress,
      sharingGroup
    );
    emit LockboxUpdated(
      protocolVersion,
      lockboxId,
      writerAddress,
      consumerAddress,
      secretSharesCid
    );
    emit PriceUpdated(
      lockboxId,
      price
    );
  }

  /**
   * Write to an existing lockbox.
   *
   * Only the writer who created a given lockbox can write to that lockbox.
   *
   * @param  protocolVersion       The protocol version.
   * @param  lockboxId             ID of the lockbox to write to.
   * @param  secretSharesCid       CID for the secret shares.
   */
  function updateLockbox(
    ProtocolVersion protocolVersion,
    uint256 lockboxId,
    bytes calldata secretSharesCid
  )
    external
    whenNotPaused
  {
    LockboxState storage lb = lockboxes[lockboxId];

    require(
      msg.sender == lb.writerAddress,
      "Lockbox#updateLockbox: The caller must be the lockbox writer."
    );

    emit LockboxUpdated(
      protocolVersion,
      lockboxId,
      lb.writerAddress,
      lb.consumerAddress,
      secretSharesCid
    );
  }

  /**
   * Open a request to read the contents of a lockbox.
   *
   * The caller must provide a signature indicating the consent of the consumer
   * for the caller to read this lockbox. The caller must pay protocol token to
   * the writer, unless the caller is the consumer. The caller must also provide
   * protocol token to pay the sharing group fee--this fee is held in escrow.
   *
   * Signature verification:
   *
   * Verification of the signature does not happen on-chain since this could be
   * easily circumvented by the sharing group if they chose to deviate from the
   * protocol. We therefore rely on the sharing group to verify signatures.
   *
   * @param  lockboxId              ID of the lockbox to open a read request against.
   * @param  maxPrice               The maximum price a reader is willing to pay for the lockbox contents.
   * @param  signatureExpiration    Unix Epoch time in seconds after which the signature expires.
   * @param  signature              The consumer's signature.
   * @param  requestPublicKey       The public key for which the sharing group should encrypt their results in the form [n, e].
   */
  function openRequest(
    uint256 lockboxId,
    uint256 maxPrice,
    uint256 signatureExpiration,
    bytes calldata signature,
    bytes[2] calldata requestPublicKey
  )
    external
    whenNotPaused
  {
    LockboxState storage lb = lockboxes[lockboxId];
    address readerAddress = msg.sender;

    require(
      maxPrice >= lb.price,
      "Lockbox#openRequest: Lockbox price is more expensive than the request max price."
    );
    require(
      getRequestStatus(lockboxId, readerAddress) != RequestStatus.OPEN,
      "Lockbox#openRequest: There is already an open request from that reader."
    );

    // Create the request.
    // The request must be created *before* calling getWriterFee() and getSharingTotalFee().
    Request storage request = lb.requests[readerAddress];

    request.price = lb.price;
    request.exists = true;
    request.challenged = false;
    request.publicKey[0] = requestPublicKey[0];
    request.publicKey[1] = requestPublicKey[1];
    delete request.partialResults;

    for (uint256 i = 0; i < lb.sharingGroup.length; i++) {
      request.partialResults.push("");
    }

    uint256 writerFee = getWriterFee(lockboxId, readerAddress);
    uint256 sharingTotalFee = getSharingTotalFee(lockboxId, readerAddress);
    uint256 totalFee = writerFee.add(sharingTotalFee);

    require(
      protocolToken.allowance(readerAddress, address(this)) >= totalFee,
      "Lockbox#openRequest: The caller must provide the contract with enough allowance to pay the request fee."
    );
    require(
      protocolToken.balanceOf(readerAddress) >= totalFee,
      "Lockbox#openRequest: The caller's balance must contain enough token to pay the request fee."
    );

    // Pay the writer.
    if (writerFee != 0) {
      protocolToken.transferFrom(readerAddress, lb.writerAddress, writerFee);
    }

    // Put the sharing group fee in escrow.
    if (sharingTotalFee != 0) {
      protocolToken.transferFrom(readerAddress, address(this), sharingTotalFee);
    }

    emit RequestOpened(
      lockboxId,
      readerAddress,
      lb.price,
      signatureExpiration,
      signature,
      requestPublicKey[0],
      requestPublicKey[1]
    );
  }

  /**
   * Post a partial result.
   *
   * Called by a sharing group member in response to a request. The partial
   * result is the member's share of the secret, encrypted with the request
   * public key.
   *
   * Upon posting the result, the member receives their fee.
   *
   * Since postResult transfers funds out of escrow as constitutes a
   * "winding down" of the contract, we allow it to be called while the contract
   * is paused.
   *
   * @param  lockboxId      ID of the lockbox for which the request was made.
   * @param  readerAddress  Address which initiated the request.
   * @param  partialResult  The member's share, encrypted with the request key.
   */
  function postResult(
    uint256 lockboxId,
    address readerAddress,
    bytes calldata partialResult
  )
    external
  {
    LockboxState storage lb = lockboxes[lockboxId];
    Request storage request = lb.requests[readerAddress];
    uint256 memberIndex = indexOf(lb.sharingGroup, msg.sender);

    require(
      memberIndex != INDEX_OF_NOT_FOUND,
      "Lockbox#postResult: The caller is not in the sharing group."
    );
    require(
      request.exists,
      "Lockbox#postResult: There is no open request for that reader."
    );
    require(
      request.partialResults[memberIndex].length == 0,
      "Lockbox#postResult: The caller has already posted their result."
    );
    require(
      partialResult.length != 0,
      "Lockbox#postResult: The posted result is empty."
    );

    request.partialResults[memberIndex] = partialResult;

    uint256 sharingFeePerMember = getSharingFeePerMember(lockboxId, readerAddress);
    if (sharingFeePerMember != 0) {
      protocolToken.transfer(msg.sender, sharingFeePerMember);
    }

    emit ResultPosted(
      lockboxId,
      readerAddress,
      msg.sender,
      partialResult
    );

    if (getRequestStatus(lockboxId, readerAddress) == RequestStatus.FILLED) {
      emit RequestFilled(lockboxId, readerAddress);
    }
  }

  /**
   * Update the lockbox price.
   *
   * Must be called by the writer of the lockbox. Since each lockbox is long-lived, the
   * price for a lockbox may need to be updated to account for inflation and other potential
   * market effects.
   *
   * Price updates will only affect future open requests, so updating price while paused should
   * not provide any immediate effects..
   *
   * @param lockboxId       ID of the lockbox to update.
   * @param updatedPrice    New price of the lockbox.
   */
  function updatePrice(uint256 lockboxId, uint256 updatedPrice) external whenNotPaused {
    LockboxState storage lb = lockboxes[lockboxId];

    // Overflow check for sharing fee calculation.
    lb.price.mul(SHARING_FEE_FRACTION);

    require(
      msg.sender == lb.writerAddress,
      "Lockbox#updatePrice: Only the lockbox writer can update the lockbox price."
    );

    lb.price = updatedPrice;

    emit PriceUpdated(lockboxId, updatedPrice);
  }

  /**
   * Challenge the result posted for a request.
   *
   * Can be called by a reader if the secret-sharing group collectively posted
   * a result that was invalid.
   *
   * Recall that the secret is a two-tuple consisting of:
   *
   *     (lockbox CID, hash of lockbox CID)
   *
   * Validity is determined by recombining the decrypted, partial results that
   * were posted by the group, and recombining these partial results to attempt
   * to reconstruct the secret. If the hash contained in the reconstructed
   * secret is valid, then the challenge fails. If the hash is invalid, then the
   * challenge succeeds.
   *
   * In the case where the challenge succeeds, the whole secret-sharing group is
   * penalized. In the case where the challenge fails, the reader who initiated
   * the challenge is penalized.
   *
   * @param lockboxId               The ID of the lockbox of the request the caller wishes to challenge.
   * @param requestPrivateKey       The RSA private key of the request in the form [d, p, q, qInv].
   */
  function challengeResult(
    uint256 lockboxId,
    bytes[4] calldata requestPrivateKey
  ) external whenNotPaused {
    LockboxState storage lb = lockboxes[lockboxId];
    Request storage request = lb.requests[msg.sender];

    // Note: If the reader opens a new request for the same lockbox, we consider
    // them to have forfeited their right to challenge the previous request.
    require(
      getRequestStatus(lockboxId, msg.sender) == RequestStatus.FILLED,
      "Lockbox#challengeResult: This request cannot be challenged."
    );

    request.challenged = true;
    BigNumber.instance[2] memory pubKey = [
      BigNumber._new(request.publicKey[0], false, false),
      BigNumber._new(request.publicKey[1], false, false)
    ];
    BigNumber.instance[4] memory privKey = [
      BigNumber._new(requestPrivateKey[0], false, false),
      BigNumber._new(requestPrivateKey[1], false, false),
      BigNumber._new(requestPrivateKey[2], false, false),
      BigNumber._new(requestPrivateKey[3], false, false)
    ];

    Challenge.validateRsaKeypair(pubKey, privKey);

    bytes[] memory decryptedShares = new bytes[](lb.sharingGroup.length);
    for (uint256 i = 0; i < lb.sharingGroup.length; i++) {
      // TODO: add msword check from BigNumber._new
      // if the partial result has invalid length, challenger wins
      if ((request.partialResults[i].length % 32 != 0)) {
        emit ResultChallenged(lockboxId, msg.sender, true);
        return;
      }
      decryptedShares[i] = Challenge.rsaDecrypt(
        BigNumber._new(request.partialResults[i], false, false),
        privKey
      );
    }
    for (uint i = 0; i < decryptedShares.length; i++) {
      if (decryptedShares[i].length != SECRET_SHARE_LENGTH_BYTES) {
        emit ResultChallenged(lockboxId, msg.sender, true);
        return;
      }
    }
    bytes memory decryptedSecret = Challenge.xorCombineShares(decryptedShares);

    uint256 cidLength = decryptedSecret.length.sub(SECRET_HASH_LENGTH);
    bytes memory cid = new bytes(cidLength);
    for (uint256 i = 0; i < cidLength; i++) {
      cid[i] = decryptedSecret[i];
    }

    bytes memory cidHash = new bytes(SECRET_HASH_LENGTH);
    for (uint256 i = 0; i < SECRET_HASH_LENGTH; i++) {
      cidHash[i] = decryptedSecret[cidLength + i];
    }

    bool challengeWon = bytesToBytes32(cidHash) != keccak256(cid);
    emit ResultChallenged(lockboxId, msg.sender, challengeWon);
  }

  // ======================= Public view functions ==================== //

  /**
   * The fee paid to each sharing group member when the request is filled.
   *
   * Calculated from the request price.
   */
  function getSharingFeePerMember(
    uint256 lockboxId,
    address readerAddress
  ) public view returns (uint256) {
    LockboxState storage lb = lockboxes[lockboxId];
    uint256 requestPrice = lb.requests[readerAddress].price;
    return requestPrice
      .mul(SHARING_FEE_FRACTION)
      .div(FRACTION_PRECISION)
      .div(lb.sharingGroup.length);
  }

  /**
   * The total fee paid to the sharing group when the request is filled.
   *
   * Calculated from the request price.
   */
  function getSharingTotalFee(
    uint256 lockboxId,
    address readerAddress
  ) public view returns (uint256) {
    LockboxState storage lb = lockboxes[lockboxId];
    return getSharingFeePerMember(lockboxId, readerAddress).mul(lb.sharingGroup.length);
  }

  /**
   * The fee paid to the writer when the request is filled.
   *
   * Calculated from the request price. The writer fee is zero if the reader is the consumer.
   */
  function getWriterFee(uint256 lockboxId, address readerAddress) public view returns (uint256) {
    LockboxState storage lb = lockboxes[lockboxId];
    if (readerAddress == lb.consumerAddress) {
      return 0;
    }
    uint256 requestPrice = lb.requests[readerAddress].price;
    return requestPrice.sub(getSharingTotalFee(lockboxId, readerAddress));
  }

  /**
   * The total fee charged to the reader when a request is opened.
   *
   * Equal to the request price, unless the reader is the lockbox consumer.
   */
  function getTotalFee(uint256 lockboxId, address readerAddress) public view returns (uint256) {
    return getWriterFee(lockboxId, readerAddress).add(getSharingTotalFee(lockboxId, readerAddress));
  }

  /**
   * Check if a request is open.
   *
   * @param  lockboxId      ID of the lockbox.
   * @param  readerAddress  Reader address.
   *
   * @return Whether a request for that lockbox is open for that reader.
   */
  function getRequestStatus(
    uint256 lockboxId,
    address readerAddress
  ) public view returns (RequestStatus) {
    LockboxState storage lb = lockboxes[lockboxId];
    Request storage request = lb.requests[readerAddress];

    if (!request.exists) {
      return RequestStatus.NULL;
    }

    if (request.challenged) {
      return RequestStatus.CHALLENGED;
    }

    for (uint256 i = 0; i < lb.sharingGroup.length; i++) {
      if (request.partialResults[i].length == 0) {
        return RequestStatus.OPEN;
      }
    }

    return RequestStatus.FILLED;
  }

  /**
   * Check the stake held by a given address.
   */
  function getStake(address owner) public view returns (uint256) {
    return stakingContract.balances(address(protocolToken), address(this), owner);
  }

  // ======================= External view functions ====================== //

  /**
   * Get the price of a given request.
   *
   * @param  lockboxId      ID of the lockbox.
   * @param  readerAddress  Reader address.
   *
   * @return The request price.
   */
  function getRequestPrice(
    uint256 lockboxId,
    address readerAddress
  ) external view returns (uint256) {
    LockboxState storage lb = lockboxes[lockboxId];
    require(
      getRequestStatus(lockboxId, readerAddress) == RequestStatus.OPEN,
      "Lockbox#getRequestPrice: There is no open request for that lockbox and reader."
    );
    return lb.requests[readerAddress].price;
  }

  /**
   * Get the minimum stake of a token that must be held by a particular owner.
   */
  function minimumStake(address token, address owner) external view returns (uint256) {
    // ALWAYS return zero for tokens we don't care about.
    if (token != address(protocolToken)) {
      return 0;
    }

    // For now, allow anyone to withdraw their token stake at any time.
    return 0;
  }

  // ======================= Internal pure functions ====================== //

  /**
   * Return the index of the address in the array, or -1 if the address is not present.
   */
  function indexOf(address[] memory array, address value) internal pure returns (uint256) {
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] == value) {
        return i;
      }
    }
    return INDEX_OF_NOT_FOUND;
  }

  /* Convert the variable-length type `bytes` to the fixed-length type `bytes32`.
   *
   * Adapted from: https://ethereum.stackexchange.com/questions/7702/how-to-convert-byte-array-to-bytes32-in-solidity
   */
  function bytesToBytes32(bytes memory b) internal pure returns (bytes32) {
    bytes32 out;
    for (uint256 i = 0; i < 32; i++) {
      out |= bytes32(b[i]) >> (i * 8);
    }
    return out;
  }

  // ======================= Admin-only functions ========================= //

  /**
   * Create multiple lockboxes.
   *
   * Can only be called once, by the pauser.
   *
   * Assume that sharingGroup is the same for every lockbox.
   */
  function migrate(
    ProtocolVersion protocolVersion,
    uint256 count,
    address[] memory writerAddressArray,
    address[] memory consumerAddressArray,
    uint256[] memory priceArray,
    bytes[] memory secretSharesCidArray,
    address[] memory sharingGroup
  )
    public // Use public instead of external due to ABIEncoderV2 not supporting all calldata arrays.
    onlyPauser
  {
    require(
      migrationCount < MAX_MIGRATIONS,
      "Lockbox#migrate: The contract has already been migrated the max number of times."
    );
    require(
      count == 0 || sharingGroup.length > 0,
      "Lockbox#migrate: The sharingGroup list must have at least one member."
    );

    // Emit the Migrated event first to make it easier to verify that no operations occurred
    // before migrating.
    migrationCount += 1;
    emit Migrated(count, nextLockboxId);

    for (uint256 i = 0; i < count; i++) {
      // Overflow check for sharing fee calculation.
      priceArray[i].mul(SHARING_FEE_FRACTION);

      uint256 lockboxId = nextLockboxId++;

      // Assign params one at a time to avoid "Stack too deep" error.
      lockboxes[lockboxId].writerAddress = writerAddressArray[i];
      lockboxes[lockboxId].consumerAddress = consumerAddressArray[i];
      lockboxes[lockboxId].price = priceArray[i];
      lockboxes[lockboxId].sharingGroup = sharingGroup;

      emit LockboxCreated(
        protocolVersion,
        lockboxId,
        writerAddressArray[i],
        consumerAddressArray[i],
        sharingGroup
      );
      emit LockboxUpdated(
        protocolVersion,
        lockboxId,
        writerAddressArray[i],
        consumerAddressArray[i],
        secretSharesCidArray[i]
      );
      emit PriceUpdated(lockboxId, priceArray[i]);
    }
  }
}
