const fs = require('fs');
let content = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');
content = content.replace("emoji = '??'", "emoji = '🏭'");
fs.writeFileSync('src/navigation/AppNavigator.tsx', content, 'utf8');
