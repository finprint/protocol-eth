/**
 * Mock data.
 */
const forge = require('node-forge');
const constants = require('./constants');
const util = require('./util');

const ACCOUNTS = {};

const LOCKBOX = {
  secretSharesCid: util.asBytes('test-secret-shares-cid'),
  price: 10,
  requestPublicKey: {
    n: new forge.jsbn.BigInteger('d085f020cdf984e91dacb14b62dace14616cb41380b1f8e6769a930d3f19e54a7694ccb09d0178f72db77950b89c1eb8dfb9c1411fb423605e6f5966c0081b9c88a42aec32e4d3608108d22f571c048ca2f3058116d3cd939cad087dccfe2ce2af434e49f7deb61c8a4c441462f21025f700aa8b536106868098818329fe782a3876cf8309efb1508f7c349b1232468d5980eeee405de7572f14d1f850b1ee7ab11b503db73dd177e23a0d1249b5f49c700eeef7ef16624e6d5194ffdb6b4bf1198009a637571374be233dbafbc1f965f1bed7ad6bb684d58d80b89437ea02b755f3b9b6317ac92a75203087db437d4cb2de676b295136cfac44359d2b8b9f89', 16),
    e: new forge.jsbn.BigInteger('010001', 16),
  },
  requestPrivateKey: {
    n: new forge.jsbn.BigInteger('d085f020cdf984e91dacb14b62dace14616cb41380b1f8e6769a930d3f19e54a7694ccb09d0178f72db77950b89c1eb8dfb9c1411fb423605e6f5966c0081b9c88a42aec32e4d3608108d22f571c048ca2f3058116d3cd939cad087dccfe2ce2af434e49f7deb61c8a4c441462f21025f700aa8b536106868098818329fe782a3876cf8309efb1508f7c349b1232468d5980eeee405de7572f14d1f850b1ee7ab11b503db73dd177e23a0d1249b5f49c700eeef7ef16624e6d5194ffdb6b4bf1198009a637571374be233dbafbc1f965f1bed7ad6bb684d58d80b89437ea02b755f3b9b6317ac92a75203087db437d4cb2de676b295136cfac44359d2b8b9f89', 16),
    e: new forge.jsbn.BigInteger('010001', 16),
    d: new forge.jsbn.BigInteger('6be2501978d7b6c7313e2ec05515e5772feca0c2525c41ed62c198814afb67e0fdb700ac039f466984329fc67eacef4c311c16fb4d9ed28ac27113ad107f6161bc644b7cc6dc12eca3f5df60f4cd9f20f01191f076d2005375c5245689df9b7370bffeda502edec3a75dcbff4c2df6e2dd876fb503df7813d0a696a338efda54f67488326eec4ea0b5b0a42574047f1a47cdbb0a22f456640252476c658b95343ce5b4606e059034633b490f09fcb190766749a980ee6287781cb2875f6c54f65047021b456b315474b8d3af004b2d12e56c4df86667a9f3954893d32af554c981476f8113823aa91bf67c19b417344bf0d1dc0754eb163005e59416a1ede2fd', 16),
    p: new forge.jsbn.BigInteger('f11acca3aefece2f53d31187966f80a7040faae20c72702c960e37f78cfe49e39087dcdd934c52d893d1d45a1af746f2ba1572aa9054afaac0c56921752e41368b15a3dab02c7d6dfcff82953c16c135f783e4deb17ab1f3115e60bd92a5baa019921b90e9a391a49ad0011a1f412543cd418a5e76b5c20236c78b93c390075f', 16),
    q: new forge.jsbn.BigInteger('dd67d8448a4fe0c24bd0af7be26d4e3007d7c254be6dfef58f8c5c44c0c5bff7dd8df3c17ce7e1b5ae6e69114f8d481d07df39d7312b91a1aefa375c02984dddd7ef8a446c5664b64726ac2970dc242058571d6272fda57440901cd81ca6f0b14591f851d93ade6fe66957733abae8e96d68e1e7210426f5e95a6ead3276ca17', 16),
    dP: new forge.jsbn.BigInteger('79f2d026ca505f0159289ce93391da449fad3d0570be41368bff4d178cdce18a9483e396bef60fc133a32201213a894c240acd20b037e5523c869d122b2ee6152c6c19a0771349ade415687b0b15874c409119a5f9a6d172dc0a1c6c464c4504cd6a353f2aad6cf110ccbc81f5e5017035d53ca362efb3dd62cfb32d5df0ef89', 16),
    dQ: new forge.jsbn.BigInteger('dd65400f99b7326b57e0bff9c37bc5d9a59e0d072cbd555c3c4500e7075537172687121e8346649f866385d0f799b168c63c63dc59a0d5a9b60d235a7085d827640c7658e174aa94d3254ab6cdd274959b80d133670558739d33fe83e472d2f0913edbef0ca81f520a3780690b6b6808338dd38789ae5b3f402f5bc8f9536bd5', 16),
    qInv: new forge.jsbn.BigInteger('14cbf82d4db6546b51b154346c5cb84556a9fe10a703d9c76ac9606469634b3812ae4060b03e24697bd9c337fef0a3cf3daa53b3afb091c5cc74f786405abbd3a5d68a1f78d1a20ded4b52470217e413e617e6b5952011d325855e4213dfced94af66cefbee3839e42cdc4368ca431a4b697ac697961d20962907b85ddbe1a0f', 16),
  },
  partialResults: [
    Buffer.from('78c842c81b685f88c66e9b8f70701159d20f1fb99ae9e660dfb2760e857b6692bb1606573637e3ea7b1afb82ccc3ee0f0d28c1937d587f70c520c3576d9ca5451cf3227d114687b534a3ee8b76159da73b7e8f7537eddb29317a5bb02d2f39e40dc892d11db603a9b20de306e6e3c389cdf716bf0367dbb51baad95681cdc5090e531e628d1d627fdcc49971a4587024a29f62875c2a5ce0249a0d38ccd70a0c617d4b32c0e9cdd89f9d26d5b34fa65a998f2ce4dc9c3674ee6d3a5126435cb120b55cee3ed776bb69ad042a8c120c5385ba1226336f92781e2a08efd1eb6a462b704d8850aeb448cc31ffe8602842e675e7671edcde2f96d37ef55df6bfe89d', 'hex'),
    Buffer.from('34e762c3146cdf7ba94539f19ba7878b8190ddacab886650744f4a00b7af9282c138f1e0e3fcff621f628cfd29e6b0387d87f466b5fe141f0fd56372833d8ed15d9cc640561af2e67e549134cc18b13953590f3bd2e8c119d6842e7d0abacf8a397b8083064a8cea27b0fe89b7a069875b0acd0c432f861c7b475404ad7198f3a8fba301b64d4761befbf0dfe483e153effad7c2d58b1d187d8ee6f5eb751243f80a5035cf40a3a3cc4ff1fecf3b0f9d6d3e22996ea5bf433eaa17285e51774c14bc6d2f52162135e534dfe80914a8716f6e7936e86a0f3b05f5f333d977b9426c20d2452ee683862638d2e2c04eaf2a742d453ea490a2896745ddeeb4dc799b', 'hex'),
  ],
  signature: (
    '0x1111111111111111222222222222222211111111111111112222222222222222'
    + '111111111111111122222222222222221111111111111111222222222222222200'
  ),
  signatureExpiration: 1000000,
};

// Calculate the secret sharing fee.
const sharingGroupSize = 2; // This is determined below, in populateAccounts().
const sharingFeePool = Math.floor(LOCKBOX.price * constants.SHARING_FEE_FRACTION);
LOCKBOX.sharingFeePerMember = Math.floor(sharingFeePool / sharingGroupSize);
LOCKBOX.sharingTotalFee = LOCKBOX.sharingFeePerMember * sharingGroupSize;
LOCKBOX.writerFee = LOCKBOX.price - LOCKBOX.sharingTotalFee;

/**
 * Populate the ACCOUNTS object.
 *
 * This is called by lockboxDescribe, before the test cases run. This is a bit
 * hacky, but the accounts are essentially constants, and it is slightly nicer
 * to be able to access them as `ACCOUNTS.foo` instead of `this.accounts.foo`.
 */
function populateAccounts(accountsList) {
  // Only run once.
  if ('root' in ACCOUNTS) { return; }

  const [
    rootAccount, writer, consumer, reader, sharingGroupMember,
    sharingGroupOtherMember, other,
  ] = accountsList;

  Object.assign(ACCOUNTS, {
    root: rootAccount,
    writer,
    consumer,
    reader,
    sharingGroupMember,
    sharingGroupOtherMember,
    other,
    sharingGroup: [sharingGroupMember, sharingGroupOtherMember],
  });
}

module.exports = {
  ACCOUNTS,
  LOCKBOX,
  populateAccounts,
};
