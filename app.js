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
const HummusRecipe = require('hummus-recipe')
const hummus = require('hummus'),
  fillForm = require('./pdf-form-fill').fillForm
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const libre = require('libreoffice-convert')
const libreConvertAsync = promisify(libre.convert)
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const Schema = mongoose.Schema
const QRSchema = new Schema({
  guid: String,
  hash: String,
})
const QRModel = mongoose.model('QR', QRSchema);
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const app = express()
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');

// Connect to mongodb
const uri = 'mongodb+srv://dbIntegra:password22@cluster0-qqiiz.azure.mongodb.net/integra?retryWrites=true&w=majority';
mongoose.connect(uri, {
  dbName: 'dbIntegra',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('DB connected.')
  })
  .catch(err => {
    console.log('Error: Unable to connect to db. ' + err)
  })

var api_routes = require('./routes/api/index');
app.use('/api', api_routes);

const encryptStringWithRsaPrivateKey = function(toEncrypt, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(toEncrypt);
  sign.end();
  const signature = sign.sign(privateKey);
  return signature.toString("base64");
};

app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    const fileData = await readFileAsync(req.file.path)
    const encryptedData = crypto.createHash('sha256')
      .update(fileData)
      .digest('hex')
    const response = await fetch('https://integraledger.azure-api.net/api/v1.4/valueexists/' + encryptedData, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
      },
    })
    const responseJson = await response.json()
    let result = {}
    if (responseJson.exists) {
      const pdfDoc = new HummusRecipe(req.file.path);
      const info = pdfDoc.info();
      result = {result: info, creationDate: responseJson.data[0].Record.creationDate}
    } else {
      result = {result: false}
    }
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err)
    })
    res.send(result)

  } catch (err) {
    res.send(err)
  }
})

app.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    const meta = Object.assign({}, req.body)
    delete meta.subscription_key
    const cartridgeType = meta.cartridge_type
    delete meta.cartridge_type
    const pass_phrase = meta.pass_phrase
    delete meta.pass_phrase
    if (!req.file) delete meta.file

    const data_form = meta.data_form;
    delete meta.data_form;

    const master_id = meta.master_id
    delete meta.master_id

    // Create pdf writer
    const writer = hummus.createWriterToModify(req.file ? req.file.path : `./${cartridgeType}.pdf`, {
      modifiedFilePath: 'modified/' + (req.file ? req.file.filename : `${cartridgeType}.pdf`)
    })
    const reader = hummus.createReader(req.file ? req.file.path : `./${cartridgeType}.pdf`)
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary()
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key])
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta))
    infoDictionary.addAdditionalInfoEntry('formJSON', data_form)
    const guid = uuidv1()
    infoDictionary.addAdditionalInfoEntry('id', guid)
    if (master_id)
      infoDictionary.addAdditionalInfoEntry('master_id', master_id)
    if (cartridgeType && cartridgeType === 'Personal') {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      const pubkeyString = publicKey.export({type: "pkcs1", format: "pem"})

      const registerKeyRes = await fetch(`http://13.58.201.212:3011/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
      })
      // const json = await registerKeyRes.json()
      const encrypted = encryptStringWithRsaPrivateKey(pass_phrase, privateKey)
      infoDictionary.addAdditionalInfoEntry('encrypted_passphrase', encrypted)
    }
    // Fill form fields
    fillForm(writer, meta)

    // Add QR Code into first page
    await QRCode.toFile('qr.png', 'https://integraapi.azurewebsites.net/QRVerify/' + guid)
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

    if (req.file && meta.organization_logo) {
      const base64Data = meta.organization_logo.split(',')[1]
      await fs.writeFileSync("qr-logo.png", base64Data, {
        encoding: "base64"
      });
    }

    ctx.drawImage(pageWidth - 65, pageHeight - 65, req.file && meta.organization_logo? 'qr-logo.png' : 'integra-qr.png', {
      transformation: {
        width: 30,
        height: 30,
        fit: 'always'
      }
    })
    pageModifier.endContext().writePage()
    pageModifier
      .attachURLLinktoCurrentPage('https://integraapi.azurewebsites.net/QRVerify/' + guid, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
      .endContext().writePage()
    writer.end()

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file ? req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf' : `${cartridgeType}_Cartridge.pdf`
    await renameFileAsync('modified/' + (req.file ? req.file.filename : `${cartridgeType}.pdf`), 'modified/' + fileName)

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
          'Ocp-Apim-Subscription-Key': req.body.subscription_key
        }),
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': req.body.subscription_key
        },
    })
    // console.log(encryptedData)
    // console.log(await response.json())

    // Store GUID and Hash to MongoDB
    const instance = new QRModel()
    instance.guid = guid
    instance.hash = encryptedData
    instance.save()

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    res.setHeader('file-name', fileName)
    res.setHeader('id', guid)
    res.setHeader('hash', encryptedData)

    res.download('modified/' + fileName, fileName)
    if (req.file)
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err)
      })
  } catch (err) {
    res.send(err)
  }
})

app.post('/doc', upload.single('file'), async (req, res) => {
  try {
    const meta = Object.assign({}, req.body)
    delete meta.subscription_key
    const data_form = meta.data_form;
    delete meta.data_form;

    const master_id = meta.master_id
    delete meta.master_id

    // Fill merge fields
    const content = fs.readFileSync(req.file.path, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater()

    doc.loadZip(zip)
    doc.setData(meta)
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
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key])
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta))
    infoDictionary.addAdditionalInfoEntry('formJSON', data_form)
    const guid = uuidv1()
    infoDictionary.addAdditionalInfoEntry('id', guid)
    if (master_id)
      infoDictionary.addAdditionalInfoEntry('master_id', master_id)

    // Add QR Code into first page
    await QRCode.toFile('qr.png', 'https://integraapi.azurewebsites.net/QRVerify/' + guid)
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

    if (meta.organization_logo) {
      const base64Data = meta.organization_logo.split(',')[1]
      await fs.writeFileSync("qr-logo.png", base64Data, {
        encoding: "base64"
      });
    }

    ctx.drawImage(pageWidth - 65, pageHeight - 65, meta.organization_logo? 'qr-logo.png' : 'integra-qr.png', {
      transformation: {
        width: 30,
        height: 30,
        fit: 'always'
      }
    })
    pageModifier.endContext().writePage()
    pageModifier
      .attachURLLinktoCurrentPage('https://integraapi.azurewebsites.net/QRVerify/' + guid, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
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
          'metaData': '',
          'value': encryptedData,
          'Ocp-Apim-Subscription-Key': req.body.subscription_key
        }),
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': req.body.subscription_key
        },
    })
    // console.log(encryptedData)
    // console.log(await response.json())

    // Store GUID and Hash to MongoDB
    const instance = new QRModel()
    instance.guid = guid
    instance.hash = encryptedData
    instance.save()

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    res.setHeader('file-name', fileName)
    res.setHeader('id', guid)
    res.setHeader('hash', encryptedData)

    res.download('modified/' + fileName, fileName)
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err)
    })
  } catch (err) {
    console.log('err')
    res.send(err)
  }
})

app.get('/QRVerify/:guid', async (req, res) => {
  try {
    const qrData = await QRModel.findOne({ guid: req.params.guid }).exec()
    if (qrData) {
      const response = await fetch('https://integraledger.azure-api.net/api/v1.4/valueexists/' + qrData.hash, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'd1097c4c28ba4b09accd006d1162ad78'
        },
      })
      const responseJson = await response.json()
      if (responseJson.exists) {
        res.render('success', {
          identityId: responseJson.data[0].Record.identityId,
          value: responseJson.data[0].Record.value,
          metaData: responseJson.data[0].Record.metaData,
          creationDate: moment(responseJson.data[0].Record.creationDate).format('LLL'),
        })
      } else {
        res.render('failure')
      }
    } else {
      res.render('failure')
    }
  } catch (err) {
    res.send(err)
  }
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('Listening on port ' + port + '!')
})
