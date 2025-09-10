const fs = require('fs');
const path = require('path');

// Read the JPG JSON and simulate a test upload
async function testJPGParsing() {
  try {
    console.log('🧪 Testing JPG parsing with improved Document AI parser...\n');
    
    // Read the JPG JSON file (simulating Document AI response)
    const jpgJsonPath = path.join(__dirname, 'jpg.json');
    const documentJson = JSON.parse(fs.readFileSync(jpgJsonPath, 'utf8'));
    
    console.log('📄 Document AI text extracted:');
    console.log('Text length:', documentJson.text.length);
    console.log('\nFirst 200 characters:');
    console.log(documentJson.text.substring(0, 200));
    console.log('\n' + '='.repeat(80));
    
    // Test with FormData
    const FormData = require('form-data');
    const axios = require('axios');
    
    // Create a simulated image upload (we'll just create a small test file)
    const testImagePath = path.join(__dirname, 'test-advising-slip.txt');
    fs.writeFileSync(testImagePath, documentJson.text);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath), {
      filename: 'advising-slip.txt',
      contentType: 'text/plain'
    });
    
    console.log('\n📤 Uploading test file to server...');
    
    try {
      const response = await axios.post('http://localhost:5000/api/upload', form, {
        headers: {
          ...form.getHeaders()
        }
      });
      
      console.log('\n✅ Server response received!');
      console.log('Status:', response.status);
      console.log('Number of courses extracted:', response.data.length);
      
      if (response.data.length > 0) {
        console.log('\n📚 Extracted Courses:');
        response.data.forEach((course, index) => {
          console.log(`${index + 1}. ${course.courseCode}`);
          console.log(`   Day: ${course.day}`);
          console.log(`   Time: ${course.startTime} - ${course.endTime}`);
          console.log(`   Room: ${course.room || 'Not specified'}`);
          console.log('');
        });
        
        // Generate schedule summary
        console.log('📅 Weekly Schedule:');
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayOrder.forEach(day => {
          const dayCourses = response.data.filter(c => c.day === day);
          if (dayCourses.length > 0) {
            console.log(`\n${day}:`);
            dayCourses
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .forEach(course => {
                console.log(`  ${course.startTime}-${course.endTime}: ${course.courseCode} (${course.room})`);
              });
          }
        });
      } else {
        console.log('\n❌ No courses were extracted.');
      }
      
    } catch (error) {
      console.error('\n❌ Error uploading to server:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testJPGParsing();
