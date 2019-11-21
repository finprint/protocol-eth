/**
 * A stand-in for Mocha's describe() adding features for the Lockbox tests.
 *
 * The following features are available for tests within lockboxDescribe():
 *   - A test context can be accessed via `this`. The context is reset between
 *     test cases.
 *   - The helper functions from `helpers/functions.js` are available as methods
 *     of the test context.
 *   - The ACCOUNTS object from `helpers/data.js` contains the "standard"
 *     accounts which are used by the helper functions and which can be used for
 *     sending transactions.
 */

const Lockbox = artifacts.require('Lockbox');
const FinprintToken = artifacts.require('FinprintToken');
const Staking = artifacts.require('Staking');

const { populateAccounts } = require('./data');
const FUNCTIONS = require('./functions');

/**
 * A stand-in for Mocha's describe() adding features for the Lockbox tests.
 */
function lockboxDescribe(name, tests) {
  // Note: The function passed to describe() should not be async.
  describe(name, () => {
    // The testContext will be reset to baseContext before each test.
    const testContext = {};
    const baseContext = {};

    // Initialize baseContext.
    before(async () => {
      const accountsList = await web3.eth.getAccounts();
      populateAccounts(accountsList);
      baseContext.instance = await Lockbox.deployed();
      baseContext.token = await FinprintToken.deployed();
      baseContext.staking = await Staking.deployed();
      Object.assign(baseContext, FUNCTIONS);
    });

    // Reset testContext before each test.
    beforeEach(() => {
      for (const prop in testContext) {
        if (Object.prototype.hasOwnProperty.call(testContext, prop)) {
          delete testContext[prop];
        }
      }
      Object.assign(testContext, baseContext);
    });

    // Allow the tests to access testContext via `this`.
    tests.call(testContext);
  });
}

module.exports = lockboxDescribe;
