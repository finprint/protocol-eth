const FinprintToken = artifacts.require('FinprintToken');
const Staking = artifacts.require('Staking');

module.exports = function (deployer) {
  deployer.then(async () => {
    await deployer.deploy(FinprintToken);
    await deployer.deploy(Staking);
  });
};
