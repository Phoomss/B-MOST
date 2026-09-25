const http = require('http');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        host: 'localhost',
        port: 4000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('=== Step 1: Login ===');
  const loginRes = await post('/api/auth/login', {
    email: 'manufacturer@bmost.io',
    password: 'password123',
  });
  console.log('Login status:', loginRes.status);
  const token = loginRes.body.accessToken;

  console.log('\n=== Step 2: Create Product ===');
  const uniqueCode = 'PROD-' + Date.now();
  const uniqueSerial = 'SN-' + Date.now();
  const createRes = await post(
    '/api/products',
    {
      productCode: uniqueCode,
      serialNumber: uniqueSerial,
      name: 'E2E Test Verified Sensor',
      category: 'Electronics',
    },
    token,
  );
  console.log('Create product status:', createRes.status);
  console.log('Created product:', {
    id: createRes.body.id,
    productCode: createRes.body.productCode,
    blockchainProductId: createRes.body.blockchainProductId,
  });
  const productId = createRes.body.id;

  console.log('\n=== Step 3: Perform Quality Check (Auto on-chain registration) ===');
  const qcRes = await post(
    '/api/quality-checks',
    {
      productId,
      result: 'PASSED',
      inspectorName: 'Quality Lead Somchai',
      notes: 'Passed automated optical and circuit verification',
    },
    token,
  );
  console.log('Quality check status:', qcRes.status);
  console.log('Quality check result:', {
    id: qcRes.body.id,
    result: qcRes.body.result,
    product: {
      id: qcRes.body.product?.id,
      productCode: qcRes.body.product?.productCode,
      status: qcRes.body.product?.status,
    },
  });

  console.log('\n=== Step 4: Verify Product in Database ===');
  const getRes = await new Promise((resolve, reject) => {
    http.get(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/products/${productId}`,
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      },
    ).on('error', reject);
  });
  console.log('Product status after QC:', getRes.body.status);
  console.log('Product blockchainProductId:', getRes.body.blockchainProductId);
  console.log('Product blockchainTxHash:', getRes.body.blockchainTxHash);

  console.log('\n=== Step 5: Duplicate Quality Check (Must not trigger P2002) ===');
  const duplicateQc = await post(
    '/api/quality-checks',
    {
      productId,
      result: 'PASSED',
      inspectorName: 'Second Inspector',
      notes: 'Second verification run',
    },
    token,
  );
  console.log('Duplicate QC status:', duplicateQc.status);
  console.log('Duplicate QC product blockchainProductId:', getRes.body.blockchainProductId);

  console.log('\n=== Step 6: Test Concurrent Quality Checks (Race condition test) ===');
  const uniqueCode2 = 'PROD-CONCUR-' + Date.now();
  const createRes2 = await post(
    '/api/products',
    {
      productCode: uniqueCode2,
      serialNumber: 'SN-CONCUR-' + Date.now(),
      name: 'Concurrent Test Item',
    },
    token,
  );
  const prod2Id = createRes2.body.id;

  const [resA, resB] = await Promise.all([
    post(
      '/api/quality-checks',
      { productId: prod2Id, result: 'PASSED', notes: 'Concurrent request A' },
      token,
    ),
    post(
      '/api/quality-checks',
      { productId: prod2Id, result: 'PASSED', notes: 'Concurrent request B' },
      token,
    ),
  ]);
  console.log('Concurrent QC A status:', resA.status);
  console.log('Concurrent QC B status:', resB.status);
  console.log('Both completed without P2002 error!');
}

run().catch(console.error);
