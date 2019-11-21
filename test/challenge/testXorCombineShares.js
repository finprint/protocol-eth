const util = require('../helpers/util');

const Challenge = artifacts.require('Challenge');

describe('xorCombineShares', () => {
  let challenge;

  before(async () => {
    challenge = await Challenge.deployed();
  });

  contract('Challenge', () => {
    it('successfully combines secret shares using XOR', async () => {
      const shares = [
        Buffer.from('randomstring1'),
        Buffer.from('randomstring2'),
        Buffer.from('randomstring3'),
      ];
      const expectedRes = `0x${Buffer.from('randomstring0').toString('hex')}`;
      const res = await challenge.xorCombineShares(shares);
      expect(res).to.equal(expectedRes);
    });

    it('reverts if shares are not all of equal length', async () => {
      const shares = [
        Buffer.from('randomstring1'),
        Buffer.from('differentlengthrandomstring'),
        Buffer.from('randomstring2'),
      ];
      await util.expectThrow(
        challenge.xorCombineShares(shares),
        /all shares must have the same length/,
      );
    });
  });
});
