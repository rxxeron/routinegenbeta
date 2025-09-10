const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUploadEndpoint() {
  try {
    console.log('🧪 Testing upload endpoint with jpg.json data...');
    
    // Create a test image file buffer (we'll use a small test image)
    const testImagePath = './jpg.json'; // Using json as test data
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test file not found');
      return;
    }
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath), {
      filename: 'test-advising-slip.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('📤 Sending request to localhost:5000/api/upload...');
    
    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: form
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      try {
        const json = JSON.parse(responseText);
        console.log('✅ Parsed JSON response:', json);
        console.log(`✅ Found ${json.length} courses`);
      } catch (e) {
        console.log('⚠️ Response is not JSON:', responseText);
      }
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadEndpoint();
