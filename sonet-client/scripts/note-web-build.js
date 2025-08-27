const path = require('path')
const fs = require('fs')

const projectRoot = path.join(__dirname, '..')
const templateFile = path.join(projectRoot, 'sonetweb', 'templates', 'scripts.html')

// Expo export (Metro bundler) doesn't generate asset-manifest.json.
// Build the script/link tags by scanning web-build output instead.
const webBuildDir = path.join(projectRoot, 'web-build')
const staticCssDir = path.join(webBuildDir, '_expo', 'static', 'css')
const staticJsDir = path.join(webBuildDir, '_expo', 'static', 'js', 'web')

const cssFiles = fs.existsSync(staticCssDir)
  ? fs.readdirSync(staticCssDir).filter(f => f.endsWith('.css'))
  : []
const jsFiles = fs.existsSync(staticJsDir)
  ? fs.readdirSync(staticJsDir).filter(f => f.endsWith('.js'))
  : []

console.log(`Found ${cssFiles.length + jsFiles.length} static assets`)
console.log(`Writing ${templateFile}`)

const outputFile = [
  ...cssFiles.map(file =>
    `<link rel="stylesheet" href="{{ staticCDNHost }}/static/css/${file}">`,
  ),
  ...jsFiles.map(file =>
    `<script defer="defer" src="{{ staticCDNHost }}/static/js/${file}"></script>`,
  ),
].join('\n')
fs.writeFileSync(templateFile, outputFile)

function copyFiles(sourceDir, targetDir) {
  const fullSource = path.join(webBuildDir, sourceDir)
  if (!fs.existsSync(fullSource)) return
  const files = fs.readdirSync(fullSource)
  files.forEach(file => {
    const sourcePath = path.join(fullSource, file)
    const targetPath = path.join(projectRoot, targetDir, file)
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`Copied ${sourcePath} to ${targetPath}`)
  })
}

// Copy files from Expo export structure to our expected static dirs
function ensureDir(dir) {
  if (!fs.existsSync(path.join(projectRoot, dir))) {
    fs.mkdirSync(path.join(projectRoot, dir), {recursive: true})
  }
}

ensureDir('sonetweb/static/js')
ensureDir('sonetweb/static/css')
ensureDir('sonetweb/static/media')

copyFiles('_expo/static/js/web', 'sonetweb/static/js')
copyFiles('_expo/static/css', 'sonetweb/static/css')
copyFiles('_expo/static/media', 'sonetweb/static/media')
