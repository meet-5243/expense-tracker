const jwt = require('jsonwebtoken');

const userId = '6a573a1b59a054206ae6befa';
const jwtSecret = 'supersecretkeyforexpensetracker12345';

const token = jwt.sign({ id: userId }, jwtSecret, { expiresIn: '1h' });

console.log('Generated Token:', token);

fetch('http://localhost:5000/api/prediction', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => {
  console.log('Status Code:', res.status);
  return res.json();
})
.then(json => {
  console.log('Response JSON:', JSON.stringify(json, null, 2));
})
.catch(err => {
  console.error('Error connecting to backend:', err.message);
});
