/**
 * Compare a Big Number to a number or another Big Number.
 */

const _ = require('lodash');
const assert = require('assert');
const web3Utils = require('web3-utils');

const BASE_16 = 'abcdef0123456789';
const RE_ADDRESS = /0x[a-fA-F0-9]{40}$/;
const BN_WORD_SIZE_HEX_CHARS = 64;

function asBytes(str) {
  return Buffer.from(str);
}

function hexEncode(str, prepadBytes) {
  let hex = Buffer.from(str).toString('hex');
  if (prepadBytes) {
    hex = hex.padStart(prepadBytes * 2, '0');
  }
  return `0x${hex}`;
}

function numberToSolidityBigNumHex(number) {
  const hexStrLen = number.toString(16).length;
  const prepadChars = Math.ceil(hexStrLen / BN_WORD_SIZE_HEX_CHARS) * BN_WORD_SIZE_HEX_CHARS;
  return `0x${number.toString(16).padStart(prepadChars, '0')}`;
}

function isAddress(x) {
  return typeof x === 'string' && !!x.match(RE_ADDRESS);
}

function normalizeAddress(address) {
  return address.toLowerCase();
}

/**
 * Normalize Solidity values to a common format.
 */
function normalizeSolidityValues(v) {
  if (Buffer.isBuffer(v)) {
    return `0x${v.toString('hex')}`;
  } if (typeof v.map === 'function') {
    // Recurse on arrays.
    return v.map(normalizeSolidityValues);
  } if (isAddress(v)) {
    return normalizeAddress(v);
  } if (web3Utils.isBN(v) || typeof v === 'number') {
    return v.toString();
  }
  return v;
}

function expectBNEqual(a, b, message) {
  let pass;
  if (typeof b === 'number') {
    pass = a.toNumber() === b;
  } else if (typeof b === 'string') {
    pass = a.toString() === b;
  } else {
    pass = a.eq(b);
  }
  message = message || `expected ${a} to equal ${b}`;
  expect(pass, message).to.be.true;
}

function expectEvents(txDescription, tx, eventNames, eventArgs) {
  const expectedEventCount = eventNames.length;
  expect(tx.logs.length).to.equal(
    expectedEventCount,
    `${txDescription}: Expected ${expectedEventCount} events to be emitted.`,
  );

  expect(_.map(tx.logs, 'event')).to.eql(
    eventNames,
    `${txDescription}: The emitted events did not have the expected names.`,
  );

  if (!eventArgs) {
    return;
  }

  expect(eventArgs.length).to.equal(
    expectedEventCount,
    'If `eventArgs` is specified it should have the same length as '
    + '`eventNames`.',
  );

  for (let i = 0; i < expectedEventCount; i++) {
    const log = tx.logs[i];
    const expectedArgs = _.mapValues(eventArgs[i], normalizeSolidityValues);
    const actualArgs = _.mapValues(log.args, normalizeSolidityValues);

    expect(actualArgs).to.deep.include(
      expectedArgs,
      `${txDescription}: Event ${log.event} did not have the expected `
      + 'argument values.',
    );
  }
}

// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/expectThrow.js
async function expectThrow(promise, expectedMessage) {
  try {
    await promise;
  } catch (error) {
    // Strangely enough, if we raise an error before the `await` statement, the
    // error will interrupt the whole test suite instead of just failing the test.
    assert(expectedMessage, 'An expected message must be passed into expectThrow().');

    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       ganache log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search('out of gas') >= 0;
    const revert = error.message.search('revert') >= 0;
    assert(
      invalidOpcode || outOfGas || revert,
      `Expected throw, got '${error}' instead.`,
    );
    assert(
      error.message.search(expectedMessage) >= 0,
      `Throw message '${error.message}' did not contain the expected string '${expectedMessage}'.`,
    );
    return;
  }
  assert.fail('Expected the call to throw, but it did not.');
}

function randomAddress() {
  const randomArray = _.times(40, () => BASE_16.charAt(Math.floor(Math.random() * BASE_16.length)));
  return `0x${_.join(randomArray, '')}`;
}

function decomposeRSAKey(publicKey, privateKey) {
  return {
    n: numberToSolidityBigNumHex(publicKey.n),
    e: numberToSolidityBigNumHex(publicKey.e),
    d: numberToSolidityBigNumHex(privateKey.d),
    p: numberToSolidityBigNumHex(privateKey.p),
    q: numberToSolidityBigNumHex(privateKey.q),
    qInv: numberToSolidityBigNumHex(privateKey.qInv),
  };
}

module.exports = {
  asBytes,
  decomposeRSAKey,
  expectBNEqual,
  expectEvents,
  expectThrow,
  hexEncode,
  numberToSolidityBigNumHex,
  normalizeAddress,
  randomAddress,
};
