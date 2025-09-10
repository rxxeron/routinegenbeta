const fs = require('fs');
const http = require('http');

// Simple test to check if server is responsive
function testServerHealth() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  };

  console.log('🔍 Testing server health...');

  const req = http.request(options, (res) => {
    console.log('✅ Server health check - Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📄 Health response:', data);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Health check error:', error.message);
  });

  req.end();
}

testServerHealth();
