const { PROTOCOL_VERSION } = require('../helpers/constants');
const { ACCOUNTS } = require('../helpers/data');
const lockboxDescribe = require('../helpers/describe');
const util = require('../helpers/util');

const MAX_MIGRATIONS = 10;

lockboxDescribe('migrate', function () {
  contract('Lockbox', () => {
    it('migrates zero lockboxes', async () => {
      const tx = await this.instance.migrate(
        PROTOCOL_VERSION.master_XOR_1, 0, [], [], [], [], [], { from: ACCOUNTS.root },
      );

      util.expectEvents(
        'migrate',
        tx,
        ['Migrated'],
        [{
          migratedLockboxCount: 0,
        }],
      );
    });
  });

  contract('Lockbox', () => {
    it('migrates three lockboxes', async () => {
      const lockboxCount = 3;

      const writerArray = [util.randomAddress(), util.randomAddress(), util.randomAddress()];
      const consumerArray = [util.randomAddress(), util.randomAddress(), util.randomAddress()];
      const priceArray = [111, 222, 333];
      const secretSharesCidArray = [
        '9b69de1d63422dbc216642b4708cad46038b6a0cc1674333e3e4a4340adbbf83',
        '9b69de1d63422dbc216642b4708cad46038b6a0cc1674333e3e4a4340adbbf84',
        '9b69de1d63422dbc216642b4708cad46038b6a0cc1674333e3e4a4340adbbf85',
      ].map(util.asBytes);

      const tx = await this.instance.migrate(
        PROTOCOL_VERSION.master_XOR_1,
        lockboxCount,
        writerArray,
        consumerArray,
        priceArray,
        secretSharesCidArray,
        ACCOUNTS.sharingGroup,
        { from: ACCOUNTS.root },
      );

      const expectedEvents = [
        'Migrated',
        'LockboxCreated', 'LockboxUpdated', 'PriceUpdated',
        'LockboxCreated', 'LockboxUpdated', 'PriceUpdated',
        'LockboxCreated', 'LockboxUpdated', 'PriceUpdated',
      ];

      // Generate the array of expected arguments for the events.
      const expectedEventArgs = [{
        initialLockboxId: '1',
        migratedLockboxCount: lockboxCount,
      }];

      for (let i = 0; i < lockboxCount; i++) {
        const lockboxId = i + 1;
        expectedEventArgs.push(...[
          {
            protocolVersion: PROTOCOL_VERSION.master_XOR_1,
            lockboxId,
            writerAddress: writerArray[i],
            consumerAddress: consumerArray[i],
            sharingGroup: ACCOUNTS.sharingGroup,
          }, {
            lockboxId,
            writerAddress: writerArray[i],
            consumerAddress: consumerArray[i],
            secretSharesCid: secretSharesCidArray[i],
          }, {
            lockboxId,
            updatedPrice: priceArray[i],
          },
        ]);
      }

      util.expectEvents('migrate', tx, expectedEvents, expectedEventArgs);
    });
  });


  contract('Lockbox', () => {
    it('does not migrate more than the max number of times', async () => {
      const version = PROTOCOL_VERSION.master_XOR_1;
      for (let i = 0; i < MAX_MIGRATIONS; i++) {
        await this.instance.migrate(
          version, 0, [], [], [], [], [], { from: ACCOUNTS.root },
        );
      }
      await util.expectThrow(
        this.instance.migrate(
          version, 0, [], [], [], [], [], { from: ACCOUNTS.root },
        ),
        /The contract has already been migrated the max number of times/,
      );
    });
  });
});
