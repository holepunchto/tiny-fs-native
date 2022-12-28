const fs = require('./')

const rs = fs.createReadStream('index.js')
const ws = fs.createWriteStream('index.copy.js')

rs.pipe(ws).on('close', function () {
  console.log('copied file')
  fs.readFile('index.copy.js', console.log)
})
