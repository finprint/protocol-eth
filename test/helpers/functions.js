/**
 * Helper functions for calling smart contract functions, with default params.
 *
 * These functions are added to the test context and should be called as methods
 * of the test context so that they have access to the context via `this`.
 */

const _ = require('lodash');
const assert = require('assert');

const { PROTOCOL_VERSION, SHARING_GROUP_MIN_STAKE } = require('./constants');
const { ACCOUNTS, LOCKBOX } = require('./data');
const { numberToSolidityBigNumHex } = require('../helpers/util');

const FIRST_LOCKBOX_ID = '1';

function checkOverrides(overrides, allowedKeys) {
  const unexpectedKeys = new Set(Object.keys(overrides));
  for (const key of allowedKeys) {
    unexpectedKeys.delete(key);
  }
  assert(unexpectedKeys.size === 0, `Got unexpected keys ${JSON.stringify([...unexpectedKeys])}`);
}

// LOCKBOX FUNCTIONS

async function createLockbox(overrides = {}) {
  checkOverrides(overrides, ['protocolVersion', 'consumer', 'price', 'secretSharesCid', 'sharingGroup', 'caller']);
  return this.instance.createLockbox(
    overrides.protocolVersion || PROTOCOL_VERSION.master_XOR_1,
    overrides.consumer || ACCOUNTS.consumer,
    overrides.price || LOCKBOX.price,
    overrides.secretSharesCid || LOCKBOX.secretSharesCid,
    overrides.sharingGroup || ACCOUNTS.sharingGroup,
    { from: overrides.caller || ACCOUNTS.writer },
  );
}

async function updateLockbox(overrides = {}) {
  checkOverrides(overrides, ['protocolVersion', 'lockboxId', 'secretSharesCid', 'caller']);
  return this.instance.updateLockbox(
    overrides.protocolVersion || PROTOCOL_VERSION.master_XOR_1,
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.secretSharesCid || LOCKBOX.secretSharesCid,
    { from: overrides.caller || ACCOUNTS.writer },
  );
}

async function openRequest(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'maxPrice', 'signatureExpiration', 'signature', 'requestPublicKey', 'caller']);
  const { n, e } = LOCKBOX.requestPublicKey;
  return this.instance.openRequest(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.maxPrice || LOCKBOX.price,
    overrides.signatureExpiration || LOCKBOX.signatureExpiration,
    overrides.signature || LOCKBOX.signature,
    overrides.requestPublicKey || [n, e].map((v) => numberToSolidityBigNumHex(v)),
    { from: overrides.caller || ACCOUNTS.reader },
  );
}

async function postResult(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'reader', 'partialResult', 'caller']);
  return this.instance.postResult(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.reader || ACCOUNTS.reader,
    overrides.partialResult || LOCKBOX.partialResults[0],
    { from: overrides.caller || ACCOUNTS.sharingGroupMember },
  );
}

async function updatePrice(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'price', 'caller']);
  return this.instance.updatePrice(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.price || LOCKBOX.price,
    { from: overrides.caller || ACCOUNTS.writer },
  );
}

async function challengeResult(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'requestPrivateKey', 'caller']);
  const {
    d, p, q, qInv,
  } = LOCKBOX.requestPrivateKey;
  return this.instance.challengeResult(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.requestPrivateKey || [d, p, q, qInv].map((v) => numberToSolidityBigNumHex(v)),
    { from: overrides.caller || ACCOUNTS.reader },
  );
}

// LOCKBOX HELPER FUNCTIONS

async function initializeStakes() {
  for (const caller of ACCOUNTS.sharingGroup) {
    await this.token.transfer(caller, SHARING_GROUP_MIN_STAKE, { from: ACCOUNTS.root });
    await this.token.approve(this.staking.address, SHARING_GROUP_MIN_STAKE, { from: caller });
    await this.staking.increaseStake(this.token.address, this.instance.address, SHARING_GROUP_MIN_STAKE, { from: caller });
  }
}

/**
 * Post result for each sharing group member.
 */
async function fillRequest(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'reader', 'partialResults']);

  // Post results in order.
  const txes = [];
  for (let i = 0; i < ACCOUNTS.sharingGroup.length; i++) {
    const caller = ACCOUNTS.sharingGroup[i];
    const partialResult = _.get(overrides, `partialResults[${i}]`, LOCKBOX.partialResults[i]);
    txes.push(await this.postResult(
      _.defaults({ caller, partialResult }, _.pick(overrides, ['lockboxId', 'reader'])),
    ));
  }
  return txes;
}

// LOCKBOX VIEW FUNCTIONS

async function getRequestStatus(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'reader']);
  const bn = await this.instance.getRequestStatus(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.reader || ACCOUNTS.reader,
  );
  return bn.toNumber();
}

async function getTotalFee(overrides = {}) {
  checkOverrides(overrides, ['lockboxId', 'reader']);
  const bn = await this.instance.getTotalFee(
    overrides.lockboxId || FIRST_LOCKBOX_ID,
    overrides.reader || ACCOUNTS.reader,
  );
  return bn.toNumber();
}

// TOKEN FUNCTIONS

async function fundFpt(account, amount) {
  amount = amount || 10000;
  return this.token.transfer(account, amount, { from: ACCOUNTS.root });
}

async function getBalance(account) {
  const bn = await this.token.balanceOf(account);
  return bn.toNumber();
}

async function setContractAllowance(account, amount) {
  return this.token.approve(this.instance.address, amount, { from: account });
}

// PAUSABLE FUNCTIONS

async function pause(overrides = {}) {
  checkOverrides(overrides, ['caller']);
  return this.instance.pause({ from: overrides.caller || ACCOUNTS.root });
}

async function unpause(overrides = {}) {
  checkOverrides(overrides, ['caller']);
  return this.instance.unpause({ from: overrides.caller || ACCOUNTS.root });
}

async function paused() {
  return this.instance.paused();
}

module.exports = {
  createLockbox,
  updateLockbox,
  openRequest,
  postResult,
  updatePrice,
  challengeResult,
  initializeStakes,
  fillRequest,
  getRequestStatus,
  getTotalFee,
  fundFpt,
  getBalance,
  setContractAllowance,
  pause,
  unpause,
  paused,
};
