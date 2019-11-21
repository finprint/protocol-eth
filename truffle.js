const assert = require('assert');
const Web3Utils = require('web3-utils');
const HDWalletProvider = require('truffle-hdwallet-provider');

const DEFAULT_GAS_PRICE = '2';

function $getRequiredEnvVar(name) {
  const v = process.env[name];
  assert(v, `${name} not set in environment.`);
  return v;
}

function infuraNetwork(name, networkId) {
  const gasPriceGwei = process.env.GAS_PRICE_GWEI || DEFAULT_GAS_PRICE;
  const gasPrice = Web3Utils.toWei(gasPriceGwei, 'gwei');
  const infuraUrl = `https://${name}.infura.io/${process.env.INFURA_KEY}`;
  const url = process.env.ETHEREUM_URL || infuraUrl;
  return {
    provider: () => new HDWalletProvider(
      $getRequiredEnvVar('MNEMONIC'),
      url,
      parseInt($getRequiredEnvVar('WALLET_INDEX'), 10),
    ),
    network_id: networkId,
    gas: '5000000',
    gasPrice,
  };
}

module.exports = {
  compilers: {
    solc: {
      version: '0.5.7',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
      evmVersion: 'petersburg', // The default.
    },
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 9545, // Default port used by `truffle develop`.
      network_id: '*', // Match any network id
    },

    ganache: {
      host: '127.0.0.1',
      port: 10545,
      network_id: '5777',
    },

    docker: {
      host: 'truffle-develop',
      port: 9545, // Default port used by `truffle develop`.
      network_id: '*', // Match any network id
    },

    kovan: infuraNetwork('kovan', '42'),
    main: infuraNetwork('mainnet', '1'),
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
    },
  },
};
