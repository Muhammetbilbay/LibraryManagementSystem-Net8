const { sequelize } = require('../src/models');

beforeAll(async () => {
  // Sync database before running tests
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});
