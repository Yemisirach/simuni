require('dotenv').config();
const { auth } = require('./dist/src/auth/better-auth.instance.js');

async function fixPasswords() {
  console.log('Registering admin...');
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: 'admin2@topwater.local',
        password: 'password123',
        name: 'Topwater Admin',
        username: '0911000001',
      }
    });
    console.log('Registered admin2@topwater.local', res);
  } catch(e) {
    console.error(e);
  }
}

fixPasswords();
