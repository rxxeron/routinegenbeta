// Simple test to check current server structure
const fs = require('fs');

// Read current server.js and check for syntax issues
const serverContent = fs.readFileSync('./server.js', 'utf8');

// Check for unmatched braces
let braceCount = 0;
let parenCount = 0;
const lines = serverContent.split('\n');

lines.forEach((line, index) => {
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  const openParens = (line.match(/\(/g) || []).length;
  const closeParens = (line.match(/\)/g) || []).length;
  
  braceCount += openBraces - closeBraces;
  parenCount += openParens - closeParens;
  
  if (line.includes('app.post') || line.includes('function') || line.includes('try') || line.includes('catch')) {
    console.log(`Line ${index + 1}: ${line.trim()} | Braces: ${braceCount} | Parens: ${parenCount}`);
  }
});

console.log('Final counts:', { braces: braceCount, parens: parenCount });
