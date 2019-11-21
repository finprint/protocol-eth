const BigNumber = artifacts.require('BigNumber');
const FinprintToken = artifacts.require('FinprintToken');
const Lockbox = artifacts.require('Lockbox');
const Staking = artifacts.require('Staking');
const Challenge = artifacts.require('Challenge');

module.exports = function (deployer, network, addresses) {
  deployer.then(async () => {
    if (network !== 'development' && network !== 'docker') {
      console.log(
        'Skipping deployment of Lockbox contract, which should be deployed '
        + 'using ZeppelinOS.',
      );
      return;
    }
    await deployer.deploy(BigNumber);
    await deployer.link(BigNumber, Challenge);
    await deployer.deploy(Challenge);

    await deployer.link(BigNumber, Lockbox);
    await deployer.link(Challenge, Lockbox);
    await deployer.deploy(Lockbox);

    const rootAddress = addresses[0];
    const lockbox = await Lockbox.deployed();
    await lockbox.initialize(rootAddress, FinprintToken.address, Staking.address);
  });
};
