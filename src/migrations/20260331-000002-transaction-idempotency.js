module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    const table = await queryInterface.describeTable('Transactions');

    if (!table.idempotency_key) {
      await queryInterface.addColumn(
        'Transactions',
        'idempotency_key',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      );
    }

    const indexes = await queryInterface.showIndex('Transactions', { transaction });
    const hasUniqueIndex = indexes.some((idx) => idx.name === 'transactions_user_idempotency_unique');

    if (!hasUniqueIndex) {
      await queryInterface.addIndex(
        'Transactions',
        ['userId', 'idempotency_key'],
        {
          name: 'transactions_user_idempotency_unique',
          unique: true,
          transaction
        }
      );
    }
  },

  async down(queryInterface, Sequelize, transaction) {
    const indexes = await queryInterface.showIndex('Transactions', { transaction });
    const hasUniqueIndex = indexes.some((idx) => idx.name === 'transactions_user_idempotency_unique');

    if (hasUniqueIndex) {
      await queryInterface.removeIndex('Transactions', 'transactions_user_idempotency_unique', { transaction });
    }

    const table = await queryInterface.describeTable('Transactions');
    if (table.idempotency_key) {
      await queryInterface.removeColumn('Transactions', 'idempotency_key', { transaction });
    }
  }
};
