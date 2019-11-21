const { REQUEST_STATUS, SHARING_FEE_FRACTION } = require('../helpers/constants');
const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

const updatedPrice = LOCKBOX.price + 100;

lockboxDescribe('updatePrice', function () {
  beforeEach(async () => {
    await this.initializeStakes();
    await this.fundFpt(ACCOUNTS.reader, 1000);
    await this.setContractAllowance(ACCOUNTS.reader, 1000);
    await this.createLockbox();
  });

  contract('Lockbox', () => {
    it('updates the price of the lockbox and subsequent requests', async () => {
      const tx1 = await this.updatePrice({ price: updatedPrice });
      await util.expectEvents('updatePrice', tx1, ['PriceUpdated'], [{ updatedPrice }]);
      const tx2 = await this.openRequest({ maxPrice: updatedPrice });
      await util.expectEvents('requestOpened', tx2, ['RequestOpened'], [{ requestPrice: updatedPrice }]);
    });
  });

  contract('Lockbox', () => {
    it('fails if the caller is not the lockbox\'s writer', async () => {
      await util.expectThrow(
        this.updatePrice({ price: updatedPrice, caller: ACCOUNTS.consumer }),
        'Only the lockbox writer can update the lockbox price.',
      );
    });
  });

  contract('Lockbox', () => {
    it('does not affect the price of an existing open request', async () => {
      await this.updatePrice({ price: updatedPrice });
      await this.openRequest({ maxPrice: updatedPrice });

      // Reset price to the initial price.
      const tx = await this.updatePrice();
      await util.expectEvents('updatePrice', tx, ['PriceUpdated'], [{ updatedPrice: LOCKBOX.price }]);

      await this.fillRequest();

      // Check that the writer received the fee according to the price at the
      // time at which the request was opened.
      const newSharingTotalFee = (
        Math.floor(
          updatedPrice * SHARING_FEE_FRACTION / ACCOUNTS.sharingGroup.length,
        ) * ACCOUNTS.sharingGroup.length
      );
      expect(await this.getBalance(ACCOUNTS.writer)).to.equal(updatedPrice - newSharingTotalFee);
      expect(await this.getRequestStatus()).to.equal(REQUEST_STATUS.FILLED);
    });
  });

  contract('Lockbox', () => {
    it('fails if there is no lockbox', async () => {
      await util.expectThrow(
        this.updatePrice({ lockboxId: 9999999 }),
        'Returned error: VM Exception while processing transaction: revert',
      );
    });
  });
});
