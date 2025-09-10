const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testHealthEndpoint() {
  try {
    const response = await axios.get('http://localhost:3001/health');
    console.log('Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

async function testUploadEndpoint() {
  try {
    // Test with test CSV file
    if (fs.existsSync('test-schedule-clean.csv')) {
      const form = new FormData();
      form.append('file', fs.createReadStream('test-schedule-clean.csv'));
      
      const response = await axios.post('http://localhost:3001/upload', form, {
        headers: form.getHeaders()
      });
      
      console.log('Upload test passed:');
      console.log(`- Found ${response.data.courses.length} courses`);
      console.log(`- Confidence: ${response.data.metadata.confidence}%`);
      console.log(`- Method: ${response.data.metadata.extractionMethod}`);
      console.log(`- Needs verification: ${response.data.metadata.needsVerification}`);
      
      return true;
    } else {
      console.log('No test CSV file found for upload test');
      return false;
    }
  } catch (error) {
    console.error('Upload test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Testing Local Parsing System ===\n');
  
  console.log('1. Testing health endpoint...');
  const healthOk = await testHealthEndpoint();
  
  if (healthOk) {
    console.log('\n2. Testing upload endpoint...');
    await testUploadEndpoint();
  }
  
  console.log('\n=== Test completed ===');
}

runTests();
