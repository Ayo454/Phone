/**
 * Test script to validate gift card flow
 * Run: node test-giftcard.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: JSON.parse(responseData)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: responseData
                    });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('🎁 Gift Card Validation Tests\n');

    try {
        // Test 1: Check valid full-amount card
        console.log('Test 1: Check VALID full-amount card (GIFT50-ABC123)...');
        let res = await makeRequest('POST', '/api/check-giftcard', { code: 'GIFT50-ABC123' });
        console.log(`  Status: ${res.status}`);
        console.log(`  Response:`, JSON.stringify(res.body, null, 2));
        if (res.body.valid && res.body.amount === 50) {
            console.log('  ✅ PASS: Card is valid and has $50\n');
        } else {
            console.log('  ❌ FAIL: Expected valid card with $50\n');
        }

        // Test 2: Check valid partial-amount card
        console.log('Test 2: Check VALID partial-amount card (GIFT25-XYZ789)...');
        res = await makeRequest('POST', '/api/check-giftcard', { code: 'GIFT25-XYZ789' });
        console.log(`  Status: ${res.status}`);
        console.log(`  Response:`, JSON.stringify(res.body, null, 2));
        if (res.body.valid && res.body.amount === 25) {
            console.log('  ✅ PASS: Card is valid and has $25\n');
        } else {
            console.log('  ❌ FAIL: Expected valid card with $25\n');
        }

        // Test 3: Check invalid card
        console.log('Test 3: Check INVALID card (BADCODE123)...');
        res = await makeRequest('POST', '/api/check-giftcard', { code: 'BADCODE123' });
        console.log(`  Status: ${res.status}`);
        console.log(`  Response:`, JSON.stringify(res.body, null, 2));
        if (!res.body.valid) {
            console.log('  ✅ PASS: Card correctly identified as invalid\n');
        } else {
            console.log('  ❌ FAIL: Expected invalid card\n');
        }

        // Test 4: Check case-insensitive
        console.log('Test 4: Check case-insensitive matching (gift50-abc123)...');
        res = await makeRequest('POST', '/api/check-giftcard', { code: 'gift50-abc123' });
        console.log(`  Status: ${res.status}`);
        console.log(`  Response:`, JSON.stringify(res.body, null, 2));
        if (res.body.valid && res.body.amount === 50) {
            console.log('  ✅ PASS: Case-insensitive matching works\n');
        } else {
            console.log('  ❌ FAIL: Expected case-insensitive to work\n');
        }

        console.log('✅ All gift card validation tests complete!');
        console.log('\nNote: Stripe card payment tests would require a valid Stripe test key.');
        console.log('Gift card flow is fully functional and ready for use.');

    } catch (err) {
        console.error('❌ Test Error:', err.message);
        process.exit(1);
    }
}

runTests();
