const BN = require('bn.js');

const util = require('./helpers/util');

const FinprintToken = artifacts.require('FinprintToken');

const EXPECTED_INITIAL_SUPPLY = new BN(10).pow(new BN(27));

contract('FinprintToken', () => {
  let contract;

  beforeEach(async () => {
    contract = await FinprintToken.deployed();
  });

  it('has the correct initial supply', async () => {
    util.expectBNEqual(await contract.INITIAL_SUPPLY(), EXPECTED_INITIAL_SUPPLY);
  });
});
