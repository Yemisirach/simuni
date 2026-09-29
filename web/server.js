const { execSync } = require('child_process');
try {
  execSync('npm run start', { stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
