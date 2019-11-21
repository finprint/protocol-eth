const forge = require('node-forge');
const { decomposeRSAKey } = require('../helpers/util');
const { LOCKBOX } = require('../helpers/data');

const Challenge = artifacts.require('Challenge');

describe('rsaDecrypt', () => {
  let challenge;

  before(async () => {
    challenge = await Challenge.deployed();
  });

  contract('Challenge', () => {
    it('successfully decrypts some ciphertext', async () => {
      const keyValues = decomposeRSAKey(LOCKBOX.requestPublicKey, LOCKBOX.requestPrivateKey);
      const publicKey = forge.pki.rsa.setPublicKey(LOCKBOX.requestPublicKey.n, LOCKBOX.requestPublicKey.e);
      const plaintext = 'QQESIMGWvTCsoFVkFopN272dxy2sFYgWikQyf8y47GHjWLwYAQENNGV5KRpMSMiE9/Sq1Fs8hApuce3l0nfRdUUX+/plAibKWPqPyllCtvKaT1x4SBOY7KHrBzId3uKO8EXDJC1a';
      const ciphertext = publicKey.encrypt(plaintext);
      const decryptedHexValue = await challenge.rsaDecryptTestOnly(`0x${Buffer.from(ciphertext, 'binary').toString('hex')}`, [keyValues.d, keyValues.p, keyValues.q, keyValues.qInv]);
      const decryptedValue = Buffer.from(decryptedHexValue.toString().slice(2), 'hex').toString();

      expect(decryptedValue).to.equal(plaintext);
    });
  });
});
