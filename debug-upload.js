const fs = require('fs');
const path = require('path');

// Test to see what's happening with file uploads
async function testUpload(filePath) {
  console.log('Testing file:', filePath);
  
  // Read the file
  const buffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  
  console.log('File size:', stats.size);
  console.log('Buffer length:', buffer.length);
  
  // Determine mimetype based on extension
  const ext = path.extname(filePath).toLowerCase();
  let mimetype = '';
  
  if (ext === '.pdf') {
    mimetype = 'application/pdf';
  } else if (ext === '.jpg' || ext === '.jpeg') {
    mimetype = 'image/jpeg';
  } else if (ext === '.png') {
    mimetype = 'image/png';
  } else if (ext === '.xlsx') {
    mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (ext === '.xls') {
    mimetype = 'application/vnd.ms-excel';
  } else if (ext === '.csv') {
    mimetype = 'text/csv';
  }
  
  console.log('Detected mimetype:', mimetype);
  
  // Test the logic from server.js
  if (mimetype === 'application/pdf') {
    console.log('✅ Would be processed as PDF');
  } else if (mimetype.startsWith('image/')) {
    console.log('✅ Would be processed as Image');
  } else if (mimetype.includes('sheet') || mimetype.includes('excel') || 
           path.basename(filePath).toLowerCase().endsWith('.csv') ||
           path.basename(filePath).toLowerCase().endsWith('.xlsx') ||
           path.basename(filePath).toLowerCase().endsWith('.xls')) {
    console.log('✅ Would be processed as Excel/CSV');
  } else {
    console.log('❌ Would be rejected as unsupported file type');
  }
}

// Test with the files that might be in the directory
const testFiles = [
  'test.pdf',
  'test.jpg', 
  'test.png',
  'AdvisingSlip.xlsx',
  'mobile-test-schedule.csv'
];

console.log('=== FILE UPLOAD LOGIC TEST ===\n');

for (const file of testFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    testUpload(fullPath);
    console.log('---');
  } else {
    console.log('File not found:', file);
  }
}
