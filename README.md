# [DEPRECATED] Finprint Ethereum Smart Contracts

A deprecated version of the Finprint protocol, implemented in Ethereum. The current version of can be found [here](https://github.com/finprint/protocol-pact).

This repository provides ideas for implementing the Finprint protocol on Ethereum, and provides general tooling examples for Solidity developers. These smart contracts differ from the current design in many ways, including the use of RSA-2048 encryption and a different challenge mechanism. We **do not** recommend using this version of the protocol in practice; this is purely meant to be an educational resource.

## Getting started

Install packages:

```
yarn
```

Run a local Ethereum instance:

```
yarn start
```

Run tests:

```
yarn test
```

## Remix IDE

Remix is an IDE for Solidity development. It provides features like syntax and
compiler warnings. Run it with:

```
remix-ide
```

Then visit [http://127.0.0.1:8080](http://127.0.0.1:8080), and click on the
chain icon in the top-left to sync to your local files.

## Deploying contracts

Running `yarn test` will automatically compile and deploy your smart contracts.
You can compile and deploy separately as follows:

```
npx truffle compile
npx truffle migrate
```

The `truffle migrate` command will run the migrations from the `migrations/`
directory, in order. The command also accepts the `--network` option and can be
used to deploy smart contracts to other networks, such as the public test and
main networks.

Outside of test and development, the `Lockbox.sol` smart contract should be
deployed using ZeppelinOS, instead of using `truffle migrate`. See the section
below on deploying with ZeppelinOS.

Also note that during development it is sometimes useful to pass the `--reset`
option to `truffle migrate`, which will run all migrations from the beginning
regardless of which migrations have run previously.

## Interacting with public networks

Some `truffle` commands take the `--network` option for communicating with
other networks. For example, we can open up interactive consoles for interacting
with the Kovan test network or the Ethereum main network as follows:

```
truffle console --network kovan
truffle console --network main
```

Our `truffle.js` config file requires the following environment variables when
interacting with the `kovan` or `main` networks:
* `INFURA_KEY`: An API key from [infura.io](https://infura.io).
* `MNEMONIC`:
A twelve-word string that unlocks a wallet. This can be obtained by creating an
account with Metamask or another wallet provider. The mnemonic unlocks your
private keys so be careful about using a mnemonic associated with real funds!
* `WALLET_INDEX`:
The index of the wallet in the account to use. You can check the selected
account address by calling `web3.eth.getAccounts()` inside `truffle console`.
This is the account that will be used for deploying contracts, so during
deployment, make sure that it has enough ETH. Cost estimates for deployment:
  * Kovan: 0.02 ETH

## Deploying upgradeable contracts with ZeppelinOS

**NOTE: This information may be out of date with the latest version of ZeppelinOS.**

### Introduction

The `Lockbox` contract uses ZeppelinOS to take advantage of
[proxy-based upgradability](https://docs.zeppelinos.org/docs/pattern.html).
A ZeppelinOS contract consists of two smart contracts, the *proxy* contract and
the *logic* contract. The proxy contract stays the same throughout upgrades and
is the entry point for interacting with the ZeppelinOS contract. The logic
contract is switched out with each upgrade. This allows us to modify the smart
contract code in place while preserving the contract address and storage.

The instructions below are based on the ZeppelinOS documentation for
[deploying](https://docs.zeppelinos.org/docs/deploying.html),
[upgrading](https://docs.zeppelinos.org/docs/upgrading.html),
and [deploying to mainnet](https://docs.zeppelinos.org/docs/mainnet).

These steps can be used to deploy to either a development or public network.

### Note on admin accounts

Every ZeppelinOS contract has an account associated with it called the
*proxy admin* account. This is the account that has permission to upgrade the
contract. Due to
[the design](https://blog.zeppelinos.org/the-transparent-proxy-pattern/)
of ZeppelinOS, the proxy admin is **not** able to interact with the contract.
Therefore, we designate two separate admin accounts:
* `ROOT_ADDRESS`:
Has pause and unpause permissions for the `Lockbox` contract.
* `PROXY_ADMIN`:
Has permission to upgrade the ZeppelinOS contract.
Owns the initial supply of `FPT` tokens.

**If deploying to a development network,** you should use the first and last
default Truffle address as the root and proxy addresses. For example, when running `npm start`, addresses `(0)` and `(9)` should be set as `ROOT_ADDRESS` and `PROXY_ADMIN` respectively:

```
(0) 0x70f0f17dc44a492508aa7860d175ceb55a91d981
...
(9) 0xdbfdba45f231546578e7b637db51a8b44715c7be
```

### Initial deployment

The following environment variables are required:
* `ROOT_ADDRESS` and `PROXY_ADMIN`:
As described in the section above.
* `NETWORK`: A network name from `truffle.json`, e.g. `development`, `kovan`,
or `main`.

**If deploying to a development network,** start the network now in a separate
tab using `npm start`. Delete any existing `zos.dev-<id>.json` files since they
can confuse the ZOS session.

**If deploying to a public network,** make sure to set the variables described
in the section “Interacting with public networks” above.

Start a ZeppelinOS session and check that we're able to talk to the network:

```bash
npx zos session --network $NETWORK --from $PROXY_ADMIN --expires 3600
npx zos status
```

You should see `Lockbox is not deployed`. If you see no errors, then we're ready
to deploy. Deploy the `Lockbox` logic contract:

```bash
npx zos push
```

When finished, information about the deployed contract will be saved to
`zos.$NETWORK.json`. Next, deploy the `FinprintToken` contract. Note that during
development it can be helpful to pass `--reset` when running `truffle migrate`.

```bash
npx truffle migrate --network $NETWORK
```

If deploying to a public network, take note of the total deployment cost under
`Final cost`.

Take note of the address of the `FinprintToken` contract and assign it to
`FINPRINT_TOKEN_ADDRESS` The address should appear in the migration output and
can also be found using `truffle networks`:

```bash
if [ "$NETWORK" = "development" ]; then
  NETWORK_NAME="development\|UNKNOWN"
else
  NETWORK_NAME=$NETWORK
fi
export FINPRINT_TOKEN_ADDRESS=$(npx truffle networks | grep $NETWORK_NAME -A 2 | grep FinprintToken | awk '{ print $2; }')
echo $FINPRINT_TOKEN_ADDRESS
```

We will now create the proxy contract which will delegate calls to the logic
contract. When creating the proxy, we need to pass in the arguments for the
initializer function.

```bash
echo $ROOT_ADDRESS
echo $FINPRINT_TOKEN_ADDRESS
npx zos create Lockbox --init initialize --args "$ROOT_ADDRESS,$FINPRINT_TOKEN_ADDRESS"
```

Take note of the proxy address. This is the address of the upgradable contract.
The address should appear in the output, where it says `Instance created at...`.
The address will also be saved to `zos.$NETWORK.json` and can be found by
calling `zos status`.

After deploying, run `npm run save-deployed` to save the deployed address to
`deployed.json`!

### Test the deployed contract

Set `PROXY_ADDRESS` to the address of the deployed proxy contract.

```bash
npx truffle console --network $NETWORK
```

Make calls to the upgradeable contract, via the proxy, to verify that it is
functioning as expected:

```javascript
truffle(development)> lockbox = await Lockbox.at(process.env.PROXY_ADDRESS)
truffle(development)> (await lockbox.SHARING_FEE_FRACTION()).toNumber()
25000
truffle(development)> (await lockbox.protocolToken()) === process.env.FINPRINT_TOKEN_ADDRESS
true
```

### Upgrading the contract (development example)

When using the development network, be sure not to shut down the network started
in the previous section or you will lose your previous deployment.

Add a new function to `Lockbox.sol`:

```solidity
function mock() public pure returns(uint256) {
  return 24;
}
```

Push a new logic contract and update the proxy to point to the new logic
contract.

```bash
npx zos push
npx zos update Lockbox
```

Open a console with `npx truffle console --network $NETWORK`
to interact with the *same* proxy contract.

```javascript
truffle(development)> lockbox = await Lockbox.at(process.env.PROXY_ADDRESS)
truffle(development)> (await lockbox.mock()).toNumber()
24
```

Thanks to the proxy pattern implemented by ZeppelinOS, the old contract is able
to make use of the new logic while preserving any data that was stored in the
contract!

Remember that when making changes to an upgradable contract, there are certain
restrictions that we must adhere to, outlined in the OpenZeppelin documentation:
[writing_contracts](https://docs.zeppelinos.org/docs/writing_contracts.html).

### Debugging

> A network name must be provided to execute the requested action.

Your `zos session` may have expired. Run the `zos session` command again to
renew the session.

> Unknown address - unable to sign transaction for this address...

The address used by `zos session` may not be the same as the address of the
account unlocked by `MNEMONIC` and `WALLET_INDEX`. Check the sender address
returned by `zos status` and verify that it is the same as the address you get
by running `web3.eth.Accounts()` in `truffle console --network $NETWORK`.

> Cannot set a proxy implementation to a non-contract address.

This may happen during development if ZOS is confused by a `zos.dev-<id>.json`
from a previous session. Delete the `zos.dev-<id>.json` file, shut down the
network, and start again.

## (DEPRECATED) Parity deployment instructions

1. Install [parity](https://www.parity.io/), a local Ethereum client.
1. Run `parity`.
1. Create an account in the parity UI (http://127.0.0.1:8180).
1. Go to https://gitter.im/kovan-testnet/faucet, sign up (e.g. using a
   Twitter account), and enter the address of the account you just
   created. 5 ETH should be sent to your account within a few
   minutes. Note that you can only get 5 ETH every 72 hours.
1. Create a file called `password` containing your account password.
1. Kill `parity` and re-run it as follows (filling in ACCOUNT_ADDRESS):

       parity --chain kovan \
         --jsonrpc-apis web3,eth,net,parity,parity_accounts,traces,rpc,parity_set,personal \
         -lrpc=trace

1. To deploy the contracts, run:

       ETH_ACCOUNT='<ACCOUNT ADDRESS>' ACCOUNT_PASSWORD='<PASSWORD>' truffle migrate --network kovan

1. You can view all activity on your account by going to `https://kovan.etherscan.io/address/<ACCOUNT ADDRESS>`
