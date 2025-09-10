const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const http = require('http');

async function testUpload(filePath) {
  try {
    console.log('Testing upload of:', filePath);
    
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/upload',
      method: 'POST',
      headers: form.getHeaders()
    };

    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', data);
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
    });

    form.pipe(req);
    
  } catch (error) {
    console.error('Test upload error:', error.message);
  }
}

// Test with AdvisingSlip.xlsx and the PDF file
testUpload('./AdvisingSlip.xlsx');
setTimeout(() => {
  testUpload('./AdvisingSlip (1).pdf');
}, 2000);
