/**
 * Copy addresses from the deployed.json file into the contract JSON files.
 *
 * This script runs when installing `finprint-protocol` as an NPM package.
 *
 * Example usage:
 *
 *   npm run compile
 *   npm run load-deployed
 */

const fs = require('fs');
const _ = require('lodash');

const CONTRACT_NAMES = ['Lockbox', 'FinprintToken'];

// Relative to the scripts/ dir.
const CONTRACTS_IN = '../build/contracts/';
const DEPLOYED_JSON = '../deployed.json';

// Relative to the root dir.
const CONTRACTS_OUT = 'build/contracts/';

// Read `deployed`.
let deployed;
try {
  deployed = require(DEPLOYED_JSON);
} catch (_e) {
  console.log(`Could not open ${DEPLOYED_JSON}. Exiting.`);
  process.exit(1);
}

// Read each contract JSON and update with data from `deployed`.
_.each(CONTRACT_NAMES, (contractName) => {
  const contractNetworks = deployed[contractName];
  if (!contractNetworks) {
    return;
  }

  const contractInPath = `${CONTRACTS_IN + contractName}.json`;
  let contractJson;
  try {
    contractJson = require(contractInPath);
  } catch (_e) {
    console.log(`Could not open ${contractInPath}. Skipping.`);
    return;
  }

  _.each(contractNetworks, (networkConfig, networkId) => {
    contractJson.networks[networkId] = networkConfig;
  });

  // Write contract JSON.
  const json = JSON.stringify(contractJson, null, 2);
  const contractOutPath = `${CONTRACTS_OUT + contractName}.json`;
  fs.writeFileSync(contractOutPath, json);
  console.log(`Wrote ${contractOutPath}`);
});
