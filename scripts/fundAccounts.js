/**
 * Fund some accounts with FPT and ETH.
 *
 * Run`truffle exec`.
 */

const FinprintToken = artifacts.require('FinprintToken');

// The accounts to fund (e.g. sharing node addresses).
const accounts = [
];

// Amounts to send to each account.
const ETH_AMOUNT = 10 ** 18; // 1 ETH.
const FPT_AMOUNT = 10 ** 4;

async function main() {
  const fp = await FinprintToken.deployed();
  const from = (await web3.eth.getAccounts())[0];

  for (const account of accounts) {
    await web3.eth.sendTransaction({
      from,
      to: account,
      value: ETH_AMOUNT,
    });
    await fp.transfer(account, FPT_AMOUNT);
    const ethBalance = await web3.eth.getBalance(account);
    const fptBalance = await fp.balanceOf(account);
    console.log(`Account ${account}\n  ETH: ${ethBalance}\n  FPT: ${fptBalance}\n`);
  }
}

module.exports = (callback) => main().then(callback).catch((error) => callback(error));
