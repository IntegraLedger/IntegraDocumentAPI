const express = require('express')
const QRCode = require('qrcode')
const cors = require('cors')
const fetch = require('node-fetch')
const crypto = require('crypto')
const fs = require('fs')
const { promisify } = require('util')
const renameFileAsync = promisify(fs.rename)
const readFileAsync = promisify(fs.readFile)
// const writeFileAsync = promisify(fs.writeFile)
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const hummus = require('hummus'),
  fillForm = require('./pdf-form-fill').fillForm
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const libre = require('libreoffice-convert')
const libreConvertAsync = promisify(libre.convert)
const app = express()
app.use(cors())

app.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    const data = req.body
    // Create pdf writer
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
    await QRCode.toFile('qr.png', 'integra')
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

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf'
    await renameFileAsync('modified/' + req.file.filename, 'modified/' + fileName)

    // SHA-256 hash file
    const fileData = await readFileAsync('modified/' + fileName)
    const encryptedData = crypto.createHash('sha256')
      .update(fileData)
      .digest('hex')
    const response = await fetch('https://integraledger.azure-api.net/api/v1.4/registerIdentity', {
        method: 'post',
        body: JSON.stringify({  
          'identityType': 'com.integraledger.lmatid',
          'metaData': 'esign by mike',
          'value': encryptedData,
          'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
        },
    })
    // console.log(encryptedData)
    // console.log(await response.json())
    
    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name')
    res.setHeader('file-name', fileName)

    res.download('modified/' + fileName, fileName)
  } catch (err) {
    res.send(err)
  }
})

app.post('/doc', upload.single('file'), async (req, res) => {
  try {
    const data = req.body
    
    // Fill merge fields
    const content = fs.readFileSync(req.file.path, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater()
    
    doc.loadZip(zip)
    doc.setData(data)
    doc.render()
    const docData = doc.getZip().generate({ type: 'nodebuffer' })
    
    // Convert word document to pdf
    const pdfData = await libreConvertAsync(docData, '.pdf', undefined)
    fs.writeFileSync(req.file.path, pdfData)

    // Create pdf writer
    const writer = hummus.createWriterToModify(req.file.path, {
      modifiedFilePath: 'modified/' + req.file.filename
    })
    const reader = hummus.createReader(req.file.path)
    
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary()
    for (const key of Object.keys(data)) {
      infoDictionary.addAdditionalInfoEntry(key, data[key])
    }
    
    // Add QR Code into first page
    await QRCode.toFile('qr.png', 'integra')
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
    
    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf'
    await renameFileAsync('modified/' + req.file.filename, 'modified/' + fileName)
    
    // SHA-256 hash file
    const fileData = await readFileAsync('modified/' + fileName)
    const encryptedData = crypto.createHash('sha256')
      .update(fileData)
      .digest('hex')
    const response = await fetch('https://integraledger.azure-api.net/api/v1.4/registerIdentity', {
        method: 'post',
        body: JSON.stringify({  
          'identityType': 'com.integraledger.lmatid',
          'metaData': 'esign by mike',
          'value': encryptedData,
          'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
        },
    })
    // console.log(encryptedData)
    // console.log(await response.json())
    
    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name')
    res.setHeader('file-name', fileName)

    res.download('modified/' + fileName, fileName)
  } catch (err) {
    console.log('err')
    res.send(err)
  }
})

app.listen(3000, () => {
  console.log('Listening on port 3000!')
})