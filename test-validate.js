// Simple test for account validation
const http = require('http');

function testAccount(bankCode, accountNumber, password) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            bankCode,
            accountNumber,
            password
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/validate-account',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Response: ${data}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Error: ${e.message}`);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function run() {
    console.log('Testing account validation...\n');
    
    console.log('Test 1: Valid FirstBank account');
    await testAccount('FIRSTBANK', '1234567890', 'password123');
    
    console.log('\nTest 2: Invalid password');
    await testAccount('FIRSTBANK', '1234567890', 'wrongpassword');
    
    console.log('\nTest 3: Valid Opay account');
    await testAccount('OPAY', '1234567890', 'opay1234');
}

run();
