const fs = require('fs');
const files = [
    'src/babylon/entities/weapons/PistolProjectile.js',
    'src/babylon/systems/PerformanceMonitor.js',
    'src/babylon/systems/UISystem.js',
    'src/babylon/ui/LootUI.js'
];
for(const f of files) {
    if(!fs.existsSync(f)) continue;
    let original = fs.readFileSync(f, 'utf8');
    let s = original;
    s = s.replace(/Ã©/g, 'é')
         .replace(/Ã¨/g, 'è')
         .replace(/Ã \b/g, 'à')
         .replace(/Ã /g, 'à')
         .replace(/Ã§/g, 'ç')
         .replace(/Ãª/g, 'ê')
         .replace(/Ã®/g, 'î')
         .replace(/Ã»/g, 'û')
         .replace(/Ã´/g, 'ô')
         .replace(/Ã¢/g, 'â')
         .replace(/Ã‰/g, 'É')
         .replace(/Ã€/g, 'À')
         .replace(/â€”/g, '—')
         .replace(/â€™/g, "'")
         .replace(/â€¦/g, '…')
         .replace(/â€œ/g, '"')
         .replace(/â€/g, '"')
         .replace(/Â\s/g, ' ')
         .replace(/Â/g, '')
         .replace(/Ã¯/g, 'ï')
         .replace(/Ã«/g, 'ë')
         .replace(/Ã¤/g, 'ä')
         .replace(/Ã¶/g, 'ö')
         .replace(/Ã¼/g, 'ü')
         .replace(/ÃŽ/g, 'Î')
         .replace(/Ã /g, 'à');

    if(s !== original) {
        fs.writeFileSync(f, s, 'utf8');
        console.log('Fixed ' + f);
    }
}
