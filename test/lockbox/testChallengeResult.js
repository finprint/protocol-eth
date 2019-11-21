/**
 * Test challenging a result.
 */

const { ACCOUNTS } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('challengeResult', function () {
  const tokenBalance = 1000;

  beforeEach(async () => {
    await this.initializeStakes();
    await this.createLockbox();
    await this.fundFpt(ACCOUNTS.reader, tokenBalance);
    await this.fundFpt(ACCOUNTS.other, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.reader, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.other, tokenBalance);
    await this.openRequest();
  });

  contract('Lockbox', () => {
    it('challenges and wins', async () => {
      await this.fillRequest({
        partialResults: [util.asBytes('garbageData'), util.asBytes('alsoGarbageData')],
      });
      const tx = await this.challengeResult();

      util.expectEvents(
        'challengeResult',
        tx,
        ['ResultChallenged'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            won: true,
          },
        ],
      );
    });
  });

  contract('Lockbox', () => {
    it('challenges and loses', async () => {
      await this.fillRequest();
      const tx = await this.challengeResult();

      util.expectEvents(
        'challengeResult',
        tx,
        ['ResultChallenged'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            won: false,
          },
        ],
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the request was never opened', async () => {
      await this.fillRequest();
      await util.expectThrow(
        this.challengeResult({ caller: ACCOUNTS.other }),
        /request cannot be challenged/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the request was not filled', async () => {
      await this.fillRequest();
      await this.openRequest({ caller: ACCOUNTS.other });
      await util.expectThrow(
        this.challengeResult({ caller: ACCOUNTS.other }),
        /request cannot be challenged/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the same request has already been re-opened', async () => {
      await this.fillRequest();
      await this.openRequest();
      await util.expectThrow(
        this.challengeResult(),
        /request cannot be challenged/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the result was already challenged', async () => {
      await this.fillRequest();
      await this.challengeResult();
      await util.expectThrow(
        this.challengeResult(),
        /request cannot be challenged/,
      );
    });
  });

  contract('Lockbox', () => {
    it('can challenge the same lockbox multiple times', async () => {
      await this.fillRequest();
      await this.challengeResult();
      for (let i = 0; i < 3; i++) {
        await this.openRequest();
        await this.fillRequest();
        await this.challengeResult();
      }
    });
  });
});
