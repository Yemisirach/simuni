require('dotenv').config();
const { auth } = require('./dist/src/auth/better-auth.instance.js');

async function fixAgent() {
  console.log('Registering agent...');
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: 'driver2@topwater.local',
        password: 'password123',
        name: 'Dawit K.',
        username: '0911000002',
      }
    });
    console.log('Registered driver2@topwater.local', res);
  } catch(e) {
    console.error(e);
  }
}

fixAgent();
