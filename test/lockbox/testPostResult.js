/**
 * Test the posting of a single result.
 *
 * See also testFillRequest.js which tests the posting of all results, together.
 */

const { ACCOUNTS, LOCKBOX } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

lockboxDescribe('postResult', function () {
  const tokenBalance = 1000;

  beforeEach(async () => {
    await this.initializeStakes();
    await this.createLockbox();
    await this.fundFpt(ACCOUNTS.reader, tokenBalance);
    await this.setContractAllowance(ACCOUNTS.reader, tokenBalance);
    await this.openRequest();
  });

  contract('Lockbox', () => {
    it('posts a result', async () => {
      const contractStartingBalance = await this.getBalance(this.instance.address);
      const writerStartingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupMemberStartingBalance = await this.getBalance(ACCOUNTS.sharingGroupMember);
      const sharingGroupOtherMemberStartingBalance = await this.getBalance(ACCOUNTS.sharingGroupOtherMember);

      const tx = await this.postResult();

      util.expectEvents(
        'postResult',
        tx,
        ['ResultPosted'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            sharingGroupMember: ACCOUNTS.sharingGroupMember,
            partialResult: LOCKBOX.partialResults[0],
          },
        ],
      );

      const contractEndingBalance = await this.getBalance(this.instance.address);
      const writerEndingBalance = await this.getBalance(ACCOUNTS.writer);
      const sharingGroupMemberEndingBalance = await this.getBalance(ACCOUNTS.sharingGroupMember);
      const sharingGroupOtherMemberEndingBalance = await this.getBalance(ACCOUNTS.sharingGroupOtherMember);

      // Writer balance is unchanged since they are paid when the request is opened.
      // The sharing group members should each receive their fee when they post their results.
      expect(contractEndingBalance - contractStartingBalance).to.equal(-LOCKBOX.sharingFeePerMember);
      expect(writerEndingBalance - writerStartingBalance).to.equal(0);
      expect(sharingGroupMemberEndingBalance - sharingGroupMemberStartingBalance).to.equal(LOCKBOX.sharingFeePerMember);
      expect(sharingGroupOtherMemberEndingBalance - sharingGroupOtherMemberStartingBalance).to.equal(0);
    });
  });

  contract('Lockbox', () => {
    it('posts a result for another member', async () => {
      const tx = await this.postResult({ caller: ACCOUNTS.sharingGroupOtherMember });

      util.expectEvents(
        'postResult',
        tx,
        ['ResultPosted'],
        [
          {
            lockboxId: '1',
            readerAddress: ACCOUNTS.reader,
            sharingGroupMember: ACCOUNTS.sharingGroupOtherMember,
            partialResult: LOCKBOX.partialResults[0],
          },
        ],
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if there is no request open for that reader', async () => {
      await util.expectThrow(
        this.postResult({ reader: ACCOUNTS.other }),
        /no open request for that reader/,
      );
    });
  });

  contract('Lockbox', () => {
    it('fails if the member already posted their result', async () => {
      await this.postResult();
      await util.expectThrow(
        this.postResult(),
        /caller has already posted their result/,
      );

      // Make sure the other member can still post.
      await this.postResult({ caller: ACCOUNTS.sharingGroupOtherMember });
    });
  });

  contract('Lockbox', () => {
    it('fails if the caller is not a member of the sharing group', async () => {
      await util.expectThrow(
        this.postResult({ caller: ACCOUNTS.other }),
        /caller is not in the sharing group/,
      );
    });
  });
});
