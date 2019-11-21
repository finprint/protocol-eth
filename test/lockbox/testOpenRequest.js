const { REQUEST_STATUS } = require('../helpers/constants');
const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('openRequest', function () {
  const tokenBalance = 1000;

  beforeEach(async () => {
    await this.initializeStakes();
    await this.fundFpt(ACCOUNTS.consumer, tokenBalance);
    await this.fundFpt(ACCOUNTS.reader, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.reader, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.consumer, tokenBalance);
    await this.createLockbox();
  });

  contract('Lockbox', () => {
    it('opens a request', async () => {
      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.NULL);

      const startingBalance = await this.getBalance(ACCOUNTS.reader);

      const tx = await this.openRequest();
      util.expectEvents(
        'openRequest',
        tx,
        ['RequestOpened'],
        [{
          lockboxId: '1',
          readerAddress: ACCOUNTS.reader,
          requestPrice: LOCKBOX.price,
          signatureExpiration: LOCKBOX.signatureExpiration,
          signature: LOCKBOX.signature,
          n: util.numberToSolidityBigNumHex(LOCKBOX.requestPublicKey.n),
          e: util.numberToSolidityBigNumHex(LOCKBOX.requestPublicKey.e),
        }],
      );

      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.OPEN);
      expect(await this.getTotalFee()).to.equal(LOCKBOX.price);
      expect(await this.getBalance(ACCOUNTS.reader)).to.equal(startingBalance - LOCKBOX.price);

      // Reader is paid when the request is opened.
      expect(await this.getBalance(ACCOUNTS.writer)).to.equal(LOCKBOX.writerFee);

      // Sharing group members are not paid until they post their results.
      expect(await this.getBalance(ACCOUNTS.sharingGroupMember)).to.equal(0);
    });
  });

  contract('Lockbox', () => {
    it('opens a request again, for the same reader', async () => {
      await this.openRequest();
      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.OPEN);
      await this.fillRequest();
      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.FILLED);
      await this.openRequest();
      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.OPEN);
    });
  });

  contract('Lockbox', () => {
    it('opens a request from the consumer without charging the writer fee', async () => {
      const startingBalance = await this.getBalance(ACCOUNTS.consumer);
      await this.openRequest({ caller: ACCOUNTS.consumer });
      expect(await this.getTotalFee({ reader: ACCOUNTS.consumer })).to.equal(LOCKBOX.sharingTotalFee);
      expect(await this.getBalance(ACCOUNTS.consumer)).to.equal(startingBalance - LOCKBOX.sharingTotalFee);
    });
  });

  contract('Lockbox', () => {
    it('fails if a request is already open for that lockbox and reader', async () => {
      await this.openRequest();
      await util.expectThrow(
        this.openRequest(),
        'There is already an open request from that reader',
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if lockbox price is higher than what the reader is willing to pay', async () => {
      await util.expectThrow(
        this.openRequest({ maxPrice: LOCKBOX.price - 1 }),
        /Lockbox price is more expensive than.*/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the contract has insufficient allowance', async () => {
      await this.setContractAllowance(ACCOUNTS.reader, 0);
      await util.expectThrow(
        this.openRequest(),
        'must provide the contract with enough allowance',
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the requester has insufficient balance', async () => {
      await this.setContractAllowance(ACCOUNTS.other, tokenBalance);
      await util.expectThrow(
        this.openRequest({ caller: ACCOUNTS.other }),
        'must contain enough token to pay the request fee.',
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if there is no lockbox', async () => {
      await util.expectThrow(
        this.openRequest({ lockboxId: 9999999 }),
        'Returned error: VM Exception while processing transaction: revert',
      );
    });
  });
});
