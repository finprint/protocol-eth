/**
 * Save deployed addresses from the contract JSON files to deployed.json.
 *
 * This script should be run after deploying contracts to a public network.
 *
 * Example usage:
 *
 *   npm run compile
 *   npm run save-deployed
 */

const fs = require('fs');
const _ = require('lodash');

const CONTRACT_NAMES = ['Lockbox', 'FinprintToken'];
const CONTRACTS_BASE_DIR = '../build/contracts/';
const NETWORK_IDS = ['1', '42'];


// Relative to the scripts/ dir.
const IN_FILE = '../deployed.json';

// Relative to the root dir.
const OUT_FILE = 'deployed.json';

// Read `deployed`.
let deployed = {};
try {
  deployed = require(IN_FILE);
} catch (_e) {}

// Update `deployed` with data from the contract JSON.
_.each(CONTRACT_NAMES, (contractName) => {
  const contractJson = require(`${CONTRACTS_BASE_DIR}${contractName}.json`);

  _.defaults(deployed, { [contractName]: {} });

  _.each(NETWORK_IDS, (networkId) => {
    if (!(networkId in contractJson.networks)) {
      console.debug(`Skipping network ${networkId} for contract ${contractName}.`);
      return;
    }
    console.debug(`Writing config for network ${networkId} for contract ${contractName}.`);
    deployed[contractName][networkId] = _.pick(
      contractJson.networks[networkId],
      ['address', 'links', 'transactionHash'],
    );
  });
});

// Write `deployed`.
const json = `${JSON.stringify(deployed, null, 2)}\n`;
fs.writeFileSync(OUT_FILE, json);
console.log(`Wrote ${OUT_FILE}`);
