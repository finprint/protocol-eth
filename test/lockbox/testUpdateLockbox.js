const { PROTOCOL_VERSION } = require('../helpers/constants');
const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('updateLockbox', function () {
  beforeEach(async () => {
    await this.initializeStakes();
  });

  contract('Lockbox', () => {
    it('updates a lockbox', async () => {
      await this.createLockbox();
      const tx = await this.updateLockbox();
      util.expectEvents(
        'updateLockbox',
        tx,
        ['LockboxUpdated'],
        [{
          protocolVersion: PROTOCOL_VERSION.master_XOR_1,
          lockboxId: '1',
          writerAddress: ACCOUNTS.writer,
          consumerAddress: ACCOUNTS.consumer,
          secretSharesCid: LOCKBOX.secretSharesCid,
        }],
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the caller is not the lockbox writer', async () => {
      await util.expectThrow(
        this.updateLockbox({ caller: ACCOUNTS.consumer }),
        /The caller must be the lockbox writer/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the protocol version is invalid', async () => {
      await util.expectThrow(
        this.updateLockbox({ protocolVersion: '2' }),
        /revert/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if there is no lockbox', async () => {
      await util.expectThrow(
        this.updateLockbox({ lockboxId: 9999999 }),
        'Returned error: VM Exception while processing transaction: revert',
      );
    });
  });
});
