/**
 * TODO: After we're more settled into the staking contract design, add more
 * coverage and decouple these tests from the other contracts (esp. Lockbox).
 */
const util = require('./helpers/util');

const FinprintToken = artifacts.require('FinprintToken');
const Lockbox = artifacts.require('Lockbox');
const Staking = artifacts.require('Staking');

describe('Staking', () => {
  let staking;
  let lockbox;
  let token;

  async function getBalance(owner) {
    return (await staking.balances(token.address, lockbox.address, owner)).toNumber();
  }

  before(async () => {
    staking = await Staking.deployed();
    lockbox = await Lockbox.deployed();
    token = await FinprintToken.deployed();
  });

  beforeEach(async () => {
    token.approve(staking.address, 5000);
  });

  contract('Staking', ([owner]) => {
    it('increases stake', async () => {
      await staking.increaseStake(token.address, lockbox.address, 1000);
      const tx = await staking.increaseStake(token.address, lockbox.address, 500);

      util.expectEvents(
        'increaseStake',
        tx,
        ['StakeChanged'],
        [{
          token: token.address,
          stakeController: lockbox.address,
          owner,
          amount: 1500,
        }],
      );

      expect(await getBalance(owner)).to.equal(1500);
    });
  });

  contract('Staking', ([owner]) => {
    it('decreases stake', async () => {
      await staking.increaseStake(token.address, lockbox.address, 1000);
      const tx = await staking.decreaseStake(token.address, lockbox.address, 500);

      util.expectEvents(
        'increaseStake',
        tx,
        ['StakeChanged'],
        [{
          token: token.address,
          stakeController: lockbox.address,
          owner,
          amount: 500,
        }],
      );

      expect(await getBalance(owner)).to.equal(500);
    });
  });
});
