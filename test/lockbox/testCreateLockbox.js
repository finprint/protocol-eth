const { PROTOCOL_VERSION } = require('../helpers/constants');
const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('createLockbox', function () {
  beforeEach(async () => {
    await this.initializeStakes();
  });

  contract('Lockbox', () => {
    it('creates a lockbox', async () => {
      const tx = await this.createLockbox();
      util.expectEvents(
        'createLockbox',
        tx,
        ['LockboxCreated', 'LockboxUpdated', 'PriceUpdated'],
        [{
          protocolVersion: PROTOCOL_VERSION.master_XOR_1,
          lockboxId: '1',
          writerAddress: ACCOUNTS.writer,
          consumerAddress: ACCOUNTS.consumer,
          sharingGroup: ACCOUNTS.sharingGroup,
        }, {
          protocolVersion: PROTOCOL_VERSION.master_XOR_1,
          lockboxId: '1',
          writerAddress: ACCOUNTS.writer,
          consumerAddress: ACCOUNTS.consumer,
          secretSharesCid: LOCKBOX.secretSharesCid,
        }, {
          lockboxId: '1',
          updatedPrice: LOCKBOX.price,
        }],
      );
    });
  });

  contract('Lockbox', () => {
    it('fails when the sharing group is empty', async () => {
      await util.expectThrow(
        this.createLockbox({ sharingGroup: [] }),
        /The sharingGroup list must have at least one member/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the protocol version is invalid', async () => {
      await util.expectThrow(
        this.createLockbox({ protocolVersion: '2' }),
        /revert/,
      );
    });
  });
});
