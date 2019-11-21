/**
 * Test the posting of all results, together, as a unit.
 *
 * See also testPostResult.js which tests the posting of a single result.
 */

const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('fillRequest', function () {
  const tokenBalance = 1000;

  beforeEach(async () => {
    await this.initializeStakes();
    await this.createLockbox();
    await this.fundFpt(ACCOUNTS.reader, tokenBalance);
    await this.fundFpt(ACCOUNTS.consumer, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.reader, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.consumer, tokenBalance);
    await this.openRequest();
  });

  contract('Lockbox', () => {
    it('fills a request', async () => {
      const contractStartingBalance = await this.getBalance(this.instance.address);
      const writerStartingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupStartingBalances = await Promise.all(ACCOUNTS.sharingGroup.map(this.getBalance.bind(this)));

      const txes = await this.fillRequest();

      expect(txes.length).to.equal(2);
      util.expectEvents(
        'postResult',
        txes[0],
        ['ResultPosted'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            sharingGroupMember: ACCOUNTS.sharingGroup[0],
            partialResult: LOCKBOX.partialResults[0],
          },
        ],
      );
      util.expectEvents(
        'postResult',
        txes[1],
        ['ResultPosted', 'RequestFilled'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            sharingGroupMember: ACCOUNTS.sharingGroup[1],
            partialResult: LOCKBOX.partialResults[1],
          },
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
          },
        ],
      );

      const contractEndingBalance = await this.getBalance(this.instance.address);
      const writerEndingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupEndingBalances = await Promise.all(ACCOUNTS.sharingGroup.map(this.getBalance.bind(this)));

      // Writer balance is unchanged since they are paid when the request is opened.
      // The sharing group members should each receive their fee when the request is filled.
      expect(contractEndingBalance - contractStartingBalance).to.equal(-LOCKBOX.sharingTotalFee);
      expect(writerEndingBalance - writerStartingBalance).to.equal(0);
      sharingGroupEndingBalances.forEach((endingBalance, i) => {
        const startingBalance = sharingGroupStartingBalances[i];
        expect(endingBalance - startingBalance).to.equal(LOCKBOX.sharingFeePerMember);
      });
    });
  });

  contract('Lockbox', () => {
    it('fails if there is no request open for that reader', async () => {
      await util.expectThrow(
        this.fillRequest({ reader: ACCOUNTS.other }),
        'There is no open request for that reader',
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if a request has already been filled', async () => {
      await this.fillRequest();
      await util.expectThrow(
        this.fillRequest(),
        'caller has already posted their result',
      );
    });
  });

  contract('Lockbox', () => {
    it('waives the writer fee when filling a request by the consumer', async () => {
      const consumerStartingBalance = await this.getBalance(ACCOUNTS.consumer);
      const writerStartingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupStartingBalances = await Promise.all(ACCOUNTS.sharingGroup.map(this.getBalance.bind(this)));

      await this.openRequest({ caller: ACCOUNTS.consumer });
      await this.fillRequest({ reader: ACCOUNTS.consumer });

      const consumerEndingBalance = await this.getBalance(ACCOUNTS.consumer);
      const writerEndingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupEndingBalances = await Promise.all(ACCOUNTS.sharingGroup.map(this.getBalance.bind(this)));

      expect(consumerEndingBalance - consumerStartingBalance).to.equal(-LOCKBOX.sharingTotalFee);
      expect(writerEndingBalance - writerStartingBalance).to.equal(0);
      sharingGroupEndingBalances.forEach((endingBalance, i) => {
        const startingBalance = sharingGroupStartingBalances[i];
        expect(endingBalance - startingBalance).to.equal(LOCKBOX.sharingFeePerMember);
      });
    });
  });
});
