const util = require('../helpers/util');
const { LOCKBOX } = require('../helpers/data');

const Challenge = artifacts.require('Challenge');


describe('validateRsaKeypair', () => {
  let challenge;

  before(async () => {
    challenge = await Challenge.deployed();
  });

  contract('Challenge', () => {
    const keyValues = util.decomposeRSAKey(LOCKBOX.requestPublicKey, LOCKBOX.requestPrivateKey);

    it('correctly validates a valid key', async () => {
      const isValid = await challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, keyValues.p, keyValues.q, keyValues.qInv]);
      expect(isValid).to.equal(true);
    });

    it('errors on too-large prime values', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, keyValues.n, keyValues.q, keyValues.qInv]),
        'prime is incorrect size',
      );

      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, keyValues.p, keyValues.n, keyValues.qInv]),
        'prime is incorrect size',
      );
    });

    it('detects non-prime p and q', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, util.numberToSolidityBigNumHex(keyValues.p - 1), util.numberToSolidityBigNumHex(keyValues.q - 1), keyValues.qInv]),
        'invalid keypair',
      );

      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, util.numberToSolidityBigNumHex(keyValues.p - 1), keyValues.q, keyValues.qInv]),
        'invalid keypair',
      );

      // TODO: uncomment this test when the is_prime issue in BigNumber is fixed
      // await util.expectThrow(
      //   challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, keyValues.p, util.numberToSolidityBigNumHex(keyValues.q-1), keyValues.qInv]),
      //   'invalid keypair'
      // )
    });

    it('detects invalid e', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, util.numberToSolidityBigNumHex(1)], [keyValues.d, keyValues.p, keyValues.q, keyValues.qInv]),
        'invalid keypair',
      );

      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, util.numberToSolidityBigNumHex(65536)], [keyValues.d, keyValues.p, keyValues.q, keyValues.qInv]),
        'invalid keypair',
      );
    });

    it('detects invalid d', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [util.numberToSolidityBigNumHex(2034895729038475), keyValues.p, keyValues.q, keyValues.qInv]),
        'invalid keypair',
      );
    });

    it('detects invalid n', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([util.numberToSolidityBigNumHex(927384658237), keyValues.e], [keyValues.d, keyValues.p, keyValues.q, keyValues.qInv]),
        'invalid keypair',
      );
    });

    it('detects invalid qInv', async () => {
      await util.expectThrow(
        challenge.validateRsaKeypairTestOnly([keyValues.n, keyValues.e], [keyValues.d, keyValues.p, keyValues.q, util.numberToSolidityBigNumHex(2098347593)]),
        'not an inverse',
      );
    });
  });
});
