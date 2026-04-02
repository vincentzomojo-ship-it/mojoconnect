module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    const allTables = await queryInterface.showAllTables({ transaction });
    const hasUsersTable = allTables.some((t) => {
      const tableName = typeof t === 'string' ? t : (t.tableName || t.table_name || '');
      return String(tableName).toLowerCase() === 'users';
    });
    if (!hasUsersTable) return;

    const table = await queryInterface.describeTable('Users');

    if (!table.email_verified) {
      await queryInterface.addColumn(
        'Users',
        'email_verified',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        { transaction }
      );
    }

    if (!table.email_verification_token) {
      await queryInterface.addColumn(
        'Users',
        'email_verification_token',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      );
    }

    if (!table.email_verification_expires) {
      await queryInterface.addColumn(
        'Users',
        'email_verification_expires',
        {
          type: Sequelize.DATE,
          allowNull: true
        },
        { transaction }
      );
    }
  },

  async down(queryInterface, Sequelize, transaction) {
    const allTables = await queryInterface.showAllTables({ transaction });
    const hasUsersTable = allTables.some((t) => {
      const tableName = typeof t === 'string' ? t : (t.tableName || t.table_name || '');
      return String(tableName).toLowerCase() === 'users';
    });
    if (!hasUsersTable) return;

    const table = await queryInterface.describeTable('Users');

    if (table.email_verification_expires) {
      await queryInterface.removeColumn('Users', 'email_verification_expires', { transaction });
    }
    if (table.email_verification_token) {
      await queryInterface.removeColumn('Users', 'email_verification_token', { transaction });
    }
    if (table.email_verified) {
      await queryInterface.removeColumn('Users', 'email_verified', { transaction });
    }
  }
};
