pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "solidity-BigNumber/contracts/BigNumber.sol";

/**
* @title Challenge
*
* This library provides the pure functions needed to challenge a Lockbox result,
* in accordance with the Finprint protocol.
*/


library Challenge {
  using BigNumber for BigNumber.instance;
  using SafeMath for uint256;

  /**
   * Check if a provided RSA public and private key are a valid keypair.
   *
   * @param publicKey     public key of the keypair to validate in the form [n, e]
   * @param privateKey    private key of the keypair to validate in the form [d, p, q, qInv]
   * @return true if valid RSA key, else revert tx
   */
  function validateRsaKeypair(
    BigNumber.instance[2] memory publicKey,
    BigNumber.instance[4] memory privateKey
  ) public view returns (bool) {
    // TODO: add support for r_i in the PKCS RSA key spec https://tools.ietf.org/html/rfc8017#appendix-A.1.2
    BigNumber.instance memory one = BigNumber._new(
      hex"0000000000000000000000000000000000000000000000000000000000000001",
      false,
      false
    );
    BigNumber.instance memory three = BigNumber._new(
      hex"0000000000000000000000000000000000000000000000000000000000000003",
      false,
      false
    );

    // validate e is odd and e != 1
    require(publicKey[1].is_odd() == 1, "invalid keypair");
    require(publicKey[1].cmp(one, false) != 0, "invalid keypair");
    // disable e = 3 for security reasons, but it isn't necessary for correctness
    require(publicKey[1].cmp(three, false) != 0, "invalid keypair");

    // validate that p and q are correct-length primes
    require(privateKey[1].bitlen == 1024, "prime is incorrect size");
    require(privateKey[2].bitlen == 1024, "prime is incorrect size");
    BigNumber.instance[3] memory primeRandomness;
    // solidity declares 2d arrays in the opposite order as most other languages, this means 3 arrays of length 4
    bytes32[4][3] memory hashBytes;
    for (uint i = 0; i < 3; i++) {
      for (uint j = 0; j < 4; j++) { // 4 * 32 = 128, which is our prime size in bytes
        hashBytes[i][j] = blockhash(block.number.sub(j.add(i.mul(4))));
      }
      primeRandomness[i] = BigNumber._new(
        abi.encodePacked(
          hashBytes[i][0],
          hashBytes[i][1],
          hashBytes[i][2],
          hashBytes[i][3]),
        false,
        false
      );
    }

    require(privateKey[1].is_prime(primeRandomness), "invalid keypair");
    // require(privateKey[2].is_prime(primeRandomness), "invalid keypair"); // TODO: debug BigNumber is_prime issues then uncomment this

    // validate qInv = q^-1 mod p
    privateKey[2].mod_inverse(privateKey[1], privateKey[3]);

    // validate p * q = n
    BigNumber.instance memory pq = privateKey[1].bn_mul(privateKey[2]);
    require(pq.cmp(publicKey[0], false) == 0, "invalid keypair");

    // validate e * d = 1 mod lambda(n)
    // lambda(n) divides phi(n), and phi(n) = (p-1)(q-1) when p and q are prime
    // so we simplify this check by validating e * d = 1 mod (p-1)(q-1) which is more restrictive than ideal
    // TODO: actually compute lambda(n) using gcd/lcm, which aren't supported by bignum
    BigNumber.instance memory pMinusOneQMinusOne = privateKey[1]
      .prepare_sub(one)
      .bn_mul(privateKey[2].prepare_sub(one));
    BigNumber.instance memory ed = publicKey[1].bn_mul(privateKey[0]);
    require(ed.bn_mod(pMinusOneQMinusOne).cmp(one, false) == 0, "invalid keypair");

    return true;
  }

  // ASSUMPTION: The lockboxCid and hash concatenated will always be a set length in bytes. Just grab these bytes at the end
  // of the array.
  function removeRsaEncryptionPadding(
    bytes memory decryptedBytes
  ) internal pure returns (bytes memory) {
    // Remove the padding. Get the number of padded zero's.
    uint256 keySize = 256;
    uint256 plaintextSize = 136;
    bytes memory result = new bytes(plaintextSize);

    uint256 startIdx = 0;
    for (uint256 i = keySize.sub(plaintextSize); i < keySize; i++) {
      result[startIdx] = decryptedBytes[i];
      startIdx++;
    }
    return result;
  }

  /**
   * TODO: Add Scheme and Scheme Options later.
   * RSA Decryption algorithm as seen in: https://github.com/digitalbazaar/forge/blob/master/lib/rsa.js
   * Private Key is in the form of d, p, q. modInverse is calculated in client side, with result qInv.
   *
   * @param c              ciphertext to decrypt
   * @param privateKey     private key in the form [d, p, q, qInv]
   */
  function rsaDecrypt(
    BigNumber.instance memory c,
    BigNumber.instance[4] memory privateKey
  ) public view returns (bytes memory) {
    BigNumber.instance memory one = BigNumber._new(
      hex"0000000000000000000000000000000000000000000000000000000000000001",
      false,
      false
    );
    BigNumber.instance memory dP = privateKey[0].bn_mod(privateKey[1].prepare_sub(one));
    BigNumber.instance memory dQ = privateKey[0].bn_mod(privateKey[2].prepare_sub(one));

    // // Perform RSA leveraging Chinese Remainer Theorem (CRT).
    BigNumber.instance memory cP = c.bn_mod(privateKey[1]).prepare_modexp(dP, privateKey[1]);
    BigNumber.instance memory cQ = c.bn_mod(privateKey[2]).prepare_modexp(dQ, privateKey[2]);

    BigNumber.instance memory _deltaCPCQ = cP.prepare_sub(cQ);
    BigNumber.instance memory _mulInvModP = _deltaCPCQ.modmul(privateKey[3], privateKey[1]);
    BigNumber.instance memory _mulQ = _mulInvModP.bn_mul(privateKey[2]);
    BigNumber.instance memory decryptedC = _mulQ.prepare_add(cQ);

    return removeRsaEncryptionPadding(decryptedC.val);
  }

  /**
   * Combine shares using xor to recreate the secret.
   * This will revert if the shares array is empty or if not all shares are of equal length.
   *
   * @param shares                  List of shares to recombine.
   */
  function xorCombineShares(bytes[] calldata shares) external pure returns (bytes memory) {
    bytes memory secret = shares[0];
    for (uint256 i = 1; i < shares.length; i++) {
      require(secret.length == shares[i].length, "all shares must have the same length");
      for (uint256 j = 0; j < shares[i].length; j++) {
        secret[j] ^= shares[i][j];
      }
    }
    return secret;
  }

  // ======================= Testing Functions ==================== //
  /**
   * privateKey represented by [d, p, q, qInv]
   */
  function rsaDecryptTestOnly(
    bytes calldata ciphertext,
    bytes[4] calldata privateKey
  ) external view returns (bytes memory) {
    return rsaDecrypt(
      BigNumber._new(ciphertext, false, false),
      [
        BigNumber._new(privateKey[0], false, false),
        BigNumber._new(privateKey[1], false, false),
        BigNumber._new(privateKey[2], false, false),
        BigNumber._new(privateKey[3], false, false)
      ]
    );
  }

  function validateRsaKeypairTestOnly(
    bytes[2] calldata publicKey,
    bytes[4] calldata privateKey
  ) external view returns (bool) {
    return validateRsaKeypair(
      [
        BigNumber._new(publicKey[0], false, false),
        BigNumber._new(publicKey[1], false, false)
      ],
      [
        BigNumber._new(privateKey[0], false, false),
        BigNumber._new(privateKey[1], false, false),
        BigNumber._new(privateKey[2], false, false),
        BigNumber._new(privateKey[3], false, false)
      ]
    );
  }
}
