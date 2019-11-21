const { ACCOUNTS } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('is Pausable', function () {
  beforeEach(async () => {
    await this.initializeStakes();
    await this.fundFpt(ACCOUNTS.reader, 1000);
    await this.setContractAllowance(ACCOUNTS.reader, 1000);
  });

  contract('Lockbox', () => {
    it('allows the contract creator to pause the contract', async () => {
      const tx = await this.pause();

      util.expectEvents('pause', tx, ['Paused']);

      expect(await this.instance.paused()).to.equal(true);
    });
  });

  contract('Lockbox', () => {
    it('allows the contract creator to unpause the contract', async () => {
      await this.pause();
      const tx = await this.unpause();

      util.expectEvents('unpause', tx, ['Unpaused']);

      expect(await this.instance.paused()).to.equal(false);
    });
  });

  contract('Lockbox', () => {
    it('does not allow others to pause the contract', async () => {
      await util.expectThrow(
        this.pause({ caller: ACCOUNTS.writer }),
        'revert',
      );
    });
  });

  contract('Lockbox', () => {
    it('does not allow others to unpause the contract', async () => {
      await this.pause();
      await util.expectThrow(
        this.unpause({ caller: ACCOUNTS.writer }),
        'revert',
      );
    });
  });

  contract('Lockbox', () => {
    it('allows the pauser to add other pausers', async () => {
      const tx = await this.instance.addPauser(ACCOUNTS.writer, { from: ACCOUNTS.root });

      util.expectEvents('addPauser', tx, ['PauserAdded'], [{ account: ACCOUNTS.writer }]);

      expect(await this.instance.isPauser(ACCOUNTS.writer)).to.equal(true);
      expect(await this.instance.paused()).to.equal(false);

      await this.pause({ caller: ACCOUNTS.writer });

      expect(await this.instance.paused()).to.equal(true);
    });
  });

  describe('while paused', () => {
    contract('Lockbox', () => {
      it('prevents creating a lockbox', async () => {
        await this.pause();
        await util.expectThrow(this.createLockbox(), 'revert');
      });
    });

    contract('Lockbox', () => {
      it('prevents updating the lockbox price', async () => {
        await this.createLockbox();
        await this.pause();
        await util.expectThrow(this.updatePrice(), 'revert');
      });
    });

    contract('Lockbox', () => {
      it('prevents opening a request', async () => {
        await this.createLockbox();
        await this.pause();
        await util.expectThrow(this.openRequest(), 'revert');
      });
    });

    contract('Lockbox', () => {
      it('allows filling a request', async () => {
        await this.createLockbox();
        await this.openRequest();
        await this.pause();
        await this.fillRequest();
      });
    });
  });

  contract('after being paused and unpaused', () => {
    beforeEach(async () => {
      await this.pause();
      await this.unpause();
    });

    contract('Lockbox', () => {
      it('allows creating a lockbox', async () => {
        await this.createLockbox();
      });
    });

    contract('Lockbox', () => {
      it('allows updating the lockbox price', async () => {
        await this.createLockbox();
        await this.updatePrice();
      });
    });

    contract('Lockbox', () => {
      it('allows opening a request', async () => {
        await this.createLockbox();
        await this.openRequest();
      });
    });

    contract('Lockbox', () => {
      it('allows filling a request', async () => {
        await this.createLockbox();
        await this.openRequest();
        await this.fillRequest();
      });
    });
  });
});
