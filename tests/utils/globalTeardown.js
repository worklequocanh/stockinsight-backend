const { execSync } = require('child_process');
const path = require('path');

module.exports = function () {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    execSync('npx prisma db seed', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 120000,
    });
    console.log('\n[Seed] Database re-seeded after all tests.');
  } catch (error) {
    console.error('[Seed] Failed to re-seed:', error.message);
  }
};
