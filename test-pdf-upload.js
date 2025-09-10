const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

async function testPDFUpload() {
  try {
    console.log('🧪 Testing PDF upload with Google Document AI...');
    
    const form = new FormData();
    const fileStream = fs.createReadStream('./AdvisingSlip (1).pdf');
    form.append('file', fileStream);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/upload',
      method: 'POST',
      headers: form.getHeaders()
    };

    console.log('📤 Uploading PDF file to Document AI...');

    const req = http.request(options, (res) => {
      console.log('📊 Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📋 Response data:');
        try {
          const jsonResponse = JSON.parse(data);
          if (Array.isArray(jsonResponse)) {
            console.log(`✅ Successfully extracted ${jsonResponse.length} course entries:`);
            jsonResponse.forEach((course, index) => {
              console.log(`  ${index + 1}. ${course.courseCode} - ${course.day} ${course.startTime}-${course.endTime} (${course.room || 'No room'})`);
            });
          } else {
            console.log('📄 Full response:', JSON.stringify(jsonResponse, null, 2));
          }
        } catch (e) {
          console.log('📄 Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    form.pipe(req);
    
  } catch (error) {
    console.error('❌ Test upload error:', error.message);
  }
}

testPDFUpload();
