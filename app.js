const express = require('express')
const QRCode = require('qrcode')
const cors = require('cors')
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const hummus = require('hummus'),
  fillForm = require('./pdf-form-fill').fillForm
const app = express()
app.use(cors())

app.post('/', upload.single('pdf'), async (req, res) => {
  const data = JSON.parse(req.body.meta)
  const writer = hummus.createWriterToModify(req.file.path, {
    modifiedFilePath: 'modified/' + req.file.filename
  })
  const reader = hummus.createReader(req.file.path)

  // Add meta data
  const infoDictionary = writer.getDocumentContext().getInfoDictionary()
  for (const key of Object.keys(data)) {
    infoDictionary.addAdditionalInfoEntry(key, data[key])
  }
  
  // Fill form fields
  fillForm(writer, data)

  // Add QR Code into first page
  try {
    await QRCode.toFile('qr.png', 'integra')
  } catch (err) {
    console.error(err)
  }
  const pageBox = reader.parsePage(0).getMediaBox()
  const pageWidth = pageBox[2] - pageBox[0]
  const pageHeight = pageBox[3] - pageBox[1]
  const pageModifier = new hummus.PDFPageModifier(writer, 0, true)
  const ctx = pageModifier.startContext().getContext()
  ctx.drawImage(pageWidth - 100, pageHeight - 100, 'qr.png', {
    transformation: {
      width: 100,
      height: 100,
      fit: 'always'
    }
  })
  pageModifier.endContext().writePage()
  pageModifier
    .attachURLLinktoCurrentPage('http://google.com', pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
    .endContext().writePage()
  writer.end()

  res.send({ msg: 'Hello World!' })
})

app.listen(3000, () => {
  console.log('Listening on port 3000!')
})