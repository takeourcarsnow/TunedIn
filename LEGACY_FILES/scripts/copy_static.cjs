/* Copy static assets and css into public/ to preserve paths */
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const root = __dirname + '/..';
copyDir(path.join(root, 'assets'), path.join(root, 'public', 'assets'));
copyDir(path.join(root, 'css'), path.join(root, 'public', 'css'));
if (fs.existsSync(path.join(root, 'favicon.ico'))) fs.copyFileSync(path.join(root, 'favicon.ico'), path.join(root, 'public', 'favicon.ico'));
if (fs.existsSync(path.join(root, 'site.webmanifest'))) fs.copyFileSync(path.join(root, 'site.webmanifest'), path.join(root, 'public', 'site.webmanifest'));
if (fs.existsSync(path.join(root, 'favicon.png'))) fs.copyFileSync(path.join(root, 'favicon.png'), path.join(root, 'public', 'favicon.png'));
console.log('Static assets copied.');
