const fs = require('fs');
const path = require('path');
function fixMojibake(dir) {
    if(dir.includes('node_modules')) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            fixMojibake(file);
        } else if (file.endsWith('.js') || file.endsWith('.vue') || file.endsWith('.md')) {
            let content = fs.readFileSync(file, 'utf8');
            let original = content;
            content = content.replace(/â”€/g, '─');
            content = content.replace(/â€œ/g, '"');
            content = content.replace(/â€/g, '"');
            content = content.replace(/â€/g, '’');
            content = content.replace(/â€¦/g, '…');
            content = content.replace(/Ã©/g, 'é');
            if (content !== original) {
                fs.writeFileSync(file, content, 'utf8');
                console.log('Fixed mojibake in', file);
            }
        }
    });
}
fixMojibake(path.join(process.cwd(), 'src'));
