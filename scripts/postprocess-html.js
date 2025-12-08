import fs from 'fs';
import path from 'path';

const OUT_DIR = './out';
const PUBLIC_DIR = './public';

function moveHtmlToIndexHtml(folder) {
  const files = fs.readdirSync(folder);

  files.forEach(file => {
    const filePath = path.join(folder, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      moveHtmlToIndexHtml(filePath);
    } else if (stat.isFile() && file.endsWith('.html') && file !== 'index.html') {
      const name = file.replace('.html', '');
      const targetDir = path.join(folder, name);
      const newFilePath = path.join(targetDir, 'index.html');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
      }

      fs.renameSync(filePath, newFilePath);
    }
  });
}

function copyStaticFiles() {
  if (fs.existsSync(path.join(PUBLIC_DIR, 'images', 'favicon.ico'))) {
    const faviconDest = path.join(OUT_DIR, 'favicon.ico');
    fs.copyFileSync(path.join(PUBLIC_DIR, 'images', 'favicon.ico'), faviconDest);
  }

  if (fs.existsSync(path.join(PUBLIC_DIR, 'images', 'ourhyt.svg'))) {
    const logoDest = path.join(OUT_DIR, 'images', 'ourhyt.svg');
    if (!fs.existsSync(path.join(OUT_DIR, 'images'))) {
      fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });
    }
    fs.copyFileSync(path.join(PUBLIC_DIR, 'images', 'ourhyt.svg'), logoDest);
  }

  if (fs.existsSync(path.join(PUBLIC_DIR, 'images'))) {
    const imagesDest = path.join(OUT_DIR, 'images');
    if (!fs.existsSync(imagesDest)) {
      fs.mkdirSync(imagesDest, { recursive: true });
    }

    function copyDir(src, dest) {
      const items = fs.readdirSync(src);
      items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    }

    copyDir(path.join(PUBLIC_DIR, 'images'), imagesDest);
  }
}

function addFaviconToHtml() {
  function processHtmlFile(filePath) {
    try {
      let htmlContent = fs.readFileSync(filePath, 'utf8');

      if (htmlContent.includes('favicon.ico')) {
        return;
      }

      const faviconLink = '<link rel="icon" href="/favicon.ico" type="image/x-icon" />';

      const metaIndex = htmlContent.indexOf('<meta');
      if (metaIndex !== -1) {
        const endMetaIndex = htmlContent.indexOf('>', metaIndex) + 1;
        const beforeMeta = htmlContent.substring(0, endMetaIndex);
        const afterMeta = htmlContent.substring(endMetaIndex);

        htmlContent = beforeMeta + '\n  ' + faviconLink + afterMeta;

        fs.writeFileSync(filePath, htmlContent, 'utf8');
      }
    } catch (error) {
      console.warn(`⚠️ Error procesando ${filePath}:`, error.message);
    }
  }

  function processHtmlFiles(dir) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        processHtmlFiles(itemPath);
      } else if (item.endsWith('.html')) {
        processHtmlFile(itemPath);
      }
    });
  }

  processHtmlFiles(OUT_DIR);
}

moveHtmlToIndexHtml(OUT_DIR);
copyStaticFiles();
addFaviconToHtml();
