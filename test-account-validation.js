const http = require('http');

// Test cases for account validation
const testCases = [
    {
        name: "Test 1: Valid FirstBank account",
        data: { bankCode: 'FIRSTBANK', accountNumber: '1234567890', password: 'password123' },
        expectedValid: true
    },
    {
        name: "Test 2: Valid Zenith Bank account",
        data: { bankCode: 'ZENITHBANK', accountNumber: '5555666677', password: 'zenith123' },
        expectedValid: true
    },
    {
        name: "Test 3: Valid Opay account",
        data: { bankCode: 'OPAY', accountNumber: '1234567890', password: 'opay1234' },
        expectedValid: true
    },
    {
        name: "Test 4: Invalid password",
        data: { bankCode: 'FIRSTBANK', accountNumber: '1234567890', password: 'wrongpassword' },
        expectedValid: false
    },
    {
        name: "Test 5: Non-existent account number",
        data: { bankCode: 'FIRSTBANK', accountNumber: '9999999999', password: 'password123' },
        expectedValid: false
    },
    {
        name: "Test 6: Non-existent bank code",
        data: { bankCode: 'INVALIDBANK', accountNumber: '1234567890', password: 'password123' },
        expectedValid: false
    }
];

async function runTests() {
    console.log('🧪 Starting Account Validation Tests...\n');
    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
        try {
            const postData = JSON.stringify(test.data);
            
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

            await new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => { responseData += chunk; });
                    res.on('end', () => {
                        const result = JSON.parse(responseData);
                        const isValid = result.success && result.valid === test.expectedValid;
                        
                        if (isValid) {
                            console.log(`✅ ${test.name}`);
                            console.log(`   Response: ${JSON.stringify(result)}`);
                            passed++;
                        } else {
                            console.log(`❌ ${test.name}`);
                            console.log(`   Expected: valid=${test.expectedValid}, Got: ${JSON.stringify(result)}`);
                            failed++;
                        }
                        console.log();
                        resolve();
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
        } catch (err) {
            console.error(`❌ ${test.name} - Error: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
}

runTests();
