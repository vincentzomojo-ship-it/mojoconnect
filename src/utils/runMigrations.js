const fs = require('fs');
const path = require('path');
const { QueryTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const META_TABLE = 'SequelizeMeta';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function ensureMetaTable() {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS \`${META_TABLE}\` (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      run_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

async function getAppliedMigrations() {
  const rows = await sequelize.query(
    `SELECT name FROM \`${META_TABLE}\``,
    { type: QueryTypes.SELECT }
  );
  return new Set(rows.map((r) => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
}

async function runMigrations() {
  await ensureMetaTable();
  const applied = await getAppliedMigrations();
  const files = getMigrationFiles();

  for (const file of files) {
    if (applied.has(file)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const migration = require(filePath);

    if (!migration || typeof migration.up !== 'function') {
      throw new Error(`Invalid migration: ${file}. Missing exported up()`);
    }

    await sequelize.transaction(async (transaction) => {
      const queryInterface = sequelize.getQueryInterface();
      await migration.up(queryInterface, Sequelize, transaction);
      await sequelize.query(
        `INSERT INTO \`${META_TABLE}\` (name) VALUES (:name)`,
        { replacements: { name: file }, transaction }
      );
    });

    console.log(`Migration applied: ${file}`);
  }
}

module.exports = runMigrations;
