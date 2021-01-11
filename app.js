require('dotenv').config();
const express = require('express')
const QRCode = require('qrcode')
const cors = require('cors')
const fetch = require('node-fetch')
const crypto = require('crypto')
const algorithm = 'aes-256-cbc';
const unzipper = require('unzipper')
const zipdir = require('zip-dir');
const parser = require('xml2json');
const js2xmlparser = require("js2xmlparser");
const CloudmersiveConvertApiClient = require('cloudmersive-convert-api-client');
const {
  Document,
  HorizontalPositionAlign,
  Media,
  Packer,
  Paragraph,
  VerticalPositionAlign,
} = require("docx");
const fs = require('fs')
const http = require('http');
const https = require('https');
const azure = require('azure-storage');

const { promisify } = require('util')
const renameFileAsync = promisify(fs.rename)
const readFileAsync = promisify(fs.readFile)
const multer  = require('multer')
const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 25 * 1024 * 1024 }
})
const HummusRecipe = require('hummus-recipe')
const hummus = require('hummus'),
  fillForm = require('./pdf-form-fill').fillForm
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const libre = require('libreoffice-convert')
const libreConvertAsync = promisify(libre.convert)

var PdfReader = require("pdfreader").PdfReader;
var filereader = require('./filereader');
var XLSX = require('xlsx');

const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-03-02; identity_beta=v3',
});
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express()
app.use(cors())
app.use( bodyParser.json({limit: '25mb'}) );
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

const getValue = async data => {
  const response = await fetch(`${process.env.BLOCKCHAIN_API_URL}/valueexists/` + data, {
    method: 'get',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
    },
  });
  return await response.json();
}

const encryptStringWithRsaPrivateKey = function(toEncrypt, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(toEncrypt);
  sign.end();
  const signature = sign.sign(privateKey);
  return signature.toString("base64");
};

const registerIdentity = async (fileName, guid, opt1 = '') => {
  // SHA-256 hash file
  const fileData = await readFileAsync('modified/' + fileName);
  const encryptedData = crypto.createHash('sha256')
    .update(fileData)
    .digest('hex');
  await fetch(`${process.env.BLOCKCHAIN_API_URL}/registerIdentity`, {
    method: 'post',
    body: JSON.stringify({
      'identityType': 'com.integraledger.lmatid',
      'metaData': 'Integra Smart Document',
      'value': encryptedData,
      'recordId': guid,
      'opt1': opt1,
      'opt2': '',
      'opt3': '',
    }),
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
    },
  });
  return encryptedData;
}

const createPublicKeyObject = public_key => {
  const pkhead = "-----BEGIN RSA PUBLIC KEY-----";
  const pkfooter = "-----END RSA PUBLIC KEY-----";

  let pubkey = public_key.replace(/\\n/g, '\n')
  let fmt = "der";
  if (pubkey.includes(pkhead)) {
    fmt = "pem";
  }
  pubkey = pubkey.replace(pkhead, "");
  pubkey = pubkey.replace(pkfooter, "pkfooter");
  pubkey = pubkey.split(" ").join("+");
  pubkey = pubkey.replace("pkfooter", pkfooter);
  pubkey = pkhead + pubkey;
  let keyData = {
    key: pubkey,
    format: fmt,
    padding: crypto.constants.RSA_NO_PADDING
  };
  if (fmt === "der") keyData.type = "pkcs1";
  return crypto.createPublicKey(keyData);
}

const createPrivateKeyObject = privateKey => {
  const pkhead = "-----BEGIN RSA PRIVATE KEY-----";
  const pkfooter = "-----END RSA PRIVATE KEY-----";

  let privkey = privateKey.replace(/\\n/g, '\n') // Incoming public key
  let fmt = "der";
  if (privkey.includes(pkhead)) {
    fmt = "pem";
  }
  privkey = privkey.replace(pkhead, "");
  privkey = privkey.replace(pkfooter, "pkfooter");
  privkey = privkey.split(" ").join("+");
  privkey = privkey.replace("pkfooter", pkfooter);
  privkey = pkhead + privkey;
  let keyData = {
    key: privkey,
    format: fmt,
    padding: crypto.constants.RSA_NO_PADDING
  };
  if (fmt === "der") keyData.type = "pkcs1";
  return crypto.createPrivateKey(keyData);
}

const encrypt = (text) => {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { key, iv, encryptedData: encrypted.toString('hex') };
}

const decrypt = (text) => {
  let iv = Buffer.from(text.iv, 'hex');
  let encryptedText = Buffer.from(text.encryptedData, 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(text.key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * @swagger
 * tags:
 *  name: Smart Doc
 *  description: API to manage smart docs.
 */

/**
 * @swagger
 * path:
 *  /analyze/:
 *    post:
 *      summary: Accept PDF, verify it and return meta data if authentic
 *      description: Accept PDF, verify it and return meta data if authentic
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: file
 *      responses:
 *        "200":
 *          description: Analyze meta data
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  result:
 *                    type: boolean
 *                  creationDate:
 *                    type: string
 */

app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    const fileData = await readFileAsync(req.file.path)
    const encryptedData = crypto.createHash('sha256')
      .update(fileData)
      .digest('hex')
    const responseJson = await getValue(encryptedData)
    let result = {}
    if (responseJson.exists) {
      const pdfDoc = new HummusRecipe(req.file.path);
      const info = pdfDoc.info();
      result = {result: info, creationDate: responseJson.data[responseJson.data.length - 1].Record.creationDate}
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

/**
 * @swagger
 * path:
 *  /analyzeDocx/:
 *    post:
 *      summary: Accept Docx file, verify it and return meta data if authenticated
 *      description: Accept Docx file, verify it and return meta data if authenticated
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: file
 *      responses:
 *        "200":
 *          description: Analyze docx file meta data
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  result:
 *                    type: boolean
 *                  creationDate:
 *                    type: string
 */

app.post('/analyzeDocx', upload.single('file'), async (req, res) => {
  try {
    const fileData = await readFileAsync(req.file.path)
    const encryptedData = crypto.createHash('sha256')
      .update(fileData)
      .digest('hex')
    const responseJson = await getValue(encryptedData)
    let result = {}
    if (responseJson.exists) {
      // Unzip docx file
      const directory = await unzipper.Open.file(req.file.path)
      await directory.extract({path: 'modified/unzipped'})

      const files = fs.readdirSync('modified/unzipped/customXml');
      const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

      const a = fs.readFileSync(`modified/unzipped/customXml/item${itemFiles.length}.xml`).toString()
      const json = parser.toJson(a, { object: true });
      const meta = {}
      if (json.Session && json.Session.xmlns === 'http://schemas.business-integrity.com/dealbuilder/2006/answers') {
        json.Session.Variable && json.Session.Variable.reduce((acc, cur) => {
          acc[cur.Name] = cur.Value;
          return acc;
        }, meta)
      }

      fs.rmdir('modified/unzipped', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
      result = {result: meta, creationDate: responseJson.data[responseJson.data.length - 1].Record.creationDate}
    } else {
      result = {result: false}
    }
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err)
    })

    res.send(result)
  } catch (err) {
    res.status(500).send(err)
  }
})

/**
 * @swagger
 * path:
 *  /pdf/:
 *    post:
 *      description: Create signed pdf format smart document with adding metadata, filling form fields of pdf file and adding QR code
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                cartridge_type:
 *                  type: string
 *                  description: required when you want cartridge smart document. It can be `Organization`, `Personal`, `Encrypt` and so on.
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                file:
 *                  type: file
 *                  description: File to put metadata. not necessary for the cartridge creation.
 *      parameters:
 *        - in: query
 *          name: type
 *          schema:
 *            type: string
 *          description: used for hedgefund to create private and public personal cartridge documents.
 *      responses:
 *        "200":
 *          description: return signed pdf file
 */

app.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    const { master_id, cartridge_type: cartridgeType, meta_form, data_form } = req.body;
    const meta = JSON.parse(meta_form);
    const pass_phrase = meta.pass_phrase
    delete meta.pass_phrase
    let readingFileName = (cartridgeType !== 'Organization' &&
      cartridgeType !== 'Personal' &&
      cartridgeType !== 'Encrypt' &&
      cartridgeType !== 'Purchaser' &&
      cartridgeType !== 'Vendor' &&
      cartridgeType !== 'VendorContract' &&
      cartridgeType !== 'PurchaseOrder' &&
      cartridgeType !== 'Invoice') ? 'CartridgeGeneric' : cartridgeType;

    const isHedgePublic = req.query.type === 'hedgefund' && cartridgeType === 'Personal' && req.query.private_id
    if (req.query.type === 'hedgefund' && cartridgeType === 'Personal') {
      readingFileName = 'Personal_Private';
      if (req.query.private_id)
        readingFileName = 'Personal_Public';
    }

    // Create pdf writer
    const writer = hummus.createWriterToModify(req.file ? req.file.path : `./${readingFileName}.pdf`, {
      modifiedFilePath: 'modified/' + (req.file ? req.file.filename : `${readingFileName}.pdf`)
    })
    const reader = hummus.createReader(req.file ? req.file.path : `./${readingFileName}.pdf`)
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary()
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key])
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta))
    infoDictionary.addAdditionalInfoEntry('formJSON', data_form)
    const guid = !isHedgePublic ? uuidv1() : req.query.private_id
    infoDictionary.addAdditionalInfoEntry('id', guid)
    if (master_id)
      infoDictionary.addAdditionalInfoEntry('master_id', master_id)
    if (cartridgeType && cartridgeType === 'Personal' && !isHedgePublic) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      const pubkeyString = publicKey.export({type: "pkcs1", format: "pem"})
      const privkeyString = privateKey.export({type: "pkcs1", format: "pem"})

      const registerKeyRes = await fetch(`${process.env.BLOCKCHAIN_API_URL}/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
      })
      // const json = await registerKeyRes.json()
      const encrypted = encryptStringWithRsaPrivateKey(pass_phrase, privateKey)
      infoDictionary.addAdditionalInfoEntry('encrypted_passphrase', encrypted)
      infoDictionary.addAdditionalInfoEntry('private_key', privkeyString)
    }
    if (cartridgeType && (cartridgeType === 'Purchaser' || cartridgeType === 'Vendor')) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      const pubkeyString = publicKey.export({type: "pkcs1", format: "pem"})
      const privkeyString = privateKey.export({type: "pkcs1", format: "pem"})

      await fetch(`${process.env.BLOCKCHAIN_API_URL}/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      infoDictionary.addAdditionalInfoEntry('private_key', privkeyString)
    }
    // Fill form fields
    meta.id = guid;
    fillForm(writer, meta)

    // Add QR Code into first page
    await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`)
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
      .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
      .endContext().writePage()
    writer.end()

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file ? req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf' : `${readingFileName}_Cartridge.pdf`
    await renameFileAsync('modified/' + (req.file ? req.file.filename : `${readingFileName}.pdf`), 'modified/' + fileName)

    const encryptedData = await registerIdentity(fileName, guid, cartridgeType && cartridgeType === 'Vendor' ? guid : '');

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    let finalFileName;
    if (req.file) finalFileName = fileName;
    else {
      if (cartridgeType === 'Organization')
        finalFileName = `${meta.organization_name} Key.pdf`;
      else if (cartridgeType === 'Personal')
        finalFileName = `${meta.given_name} ${meta.family_name} Key.pdf`;
      else if (cartridgeType === 'Encrypt')
        finalFileName = `Encrypt.pdf`;
      else finalFileName = `${cartridgeType}.pdf`;

      if (req.query.type === 'hedgefund' && cartridgeType === 'Personal')
        finalFileName = `${readingFileName}.pdf`
    }
    res.setHeader('file-name', finalFileName)
    res.setHeader('id', guid)
    if (!isHedgePublic) {
      res.setHeader('hash', encryptedData)
    }

    res.download('modified/' + fileName, fileName, (err) => {
      fs.unlink(`modified/${fileName}`, (err) => {
        if (err) console.log(err)
      })
    })
    if (req.file)
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err)
      })
  } catch (err) {
    res.status(500).send(err)
  }
})

/**
 * @swagger
 * path:
 *  /doc/:
 *    post:
 *      description: Create signed docx format smart document with adding metadata, filling form fields of pdf file and adding QR code
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                file:
 *                  type: file
 *                  description: File to put metadata.
 *      responses:
 *        "200":
 *          description: return signed docx file
 */

app.post('/doc', upload.single('file'), async (req, res) => {
  try {
    const { master_id, meta_form, data_form } = req.body;

    const meta = JSON.parse(meta_form);

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
    await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`)
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
      .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
      .endContext().writePage()
    writer.end()

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf'
    await renameFileAsync('modified/' + req.file.filename, 'modified/' + fileName)

    const encryptedData = await registerIdentity(fileName, guid);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    res.setHeader('file-name', fileName)
    res.setHeader('id', guid)
    res.setHeader('hash', encryptedData)

    res.download('modified/' + fileName, fileName, (err) => {
      fs.unlink(`modified/${fileName}`, (err) => {
        if (err) console.log(err)
      })
    })
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err)
    })
  } catch (err) {
    console.log(err)
    res.status(err.statusCode || 500).send(err)
  }
})

/**
 * @swagger
 * path:
 *  /docxSmartDoc/:
 *    post:
 *      description: Create signed docx format smart document with adding metadata, filling form fields of docx file and adding QR code
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                logo_url:
 *                  type: string
 *                  required: false
 *                  description: url of the logo image for qr code section.
 *                logo:
 *                  type: file
 *                  required: false
 *                  description: File of the logo image for qr code section.
 *                file:
 *                  type: file
 *                  description: File to put metadata.
 *      responses:
 *        "200":
 *          description: return signed docx file
 */

const mergeDocx = (inputFile1, inputFile2) => {
  return new Promise((resolve, reject) => {
    const defaultClient = CloudmersiveConvertApiClient.ApiClient.instance;
    const Apikey = defaultClient.authentications['Apikey'];
    Apikey.apiKey = process.env.CLOUDMERSIVE_KEY;
    Apikey.apiKeyPrefix = null;
    const apiInstance = new CloudmersiveConvertApiClient.MergeDocumentApi();
    const callback = function(error, data, response) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    };
    apiInstance.mergeDocumentDocx(inputFile1, inputFile2, callback);
  })
}

app.post('/docxSmartDoc', upload.fields([{ name: 'file', maxCount: 1}, { name: 'logo', maxCount: 1}]), async (req, res) => {
  try {
    const { master_id, meta_form, data_form, logo_url } = req.body;

    const meta = JSON.parse(meta_form);

    // Fill merge fields
    const content = fs.readFileSync(req.files['file'][0].path, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater()

    doc.loadZip(zip)
    doc.setData(meta)
    doc.render()
    const docData = doc.getZip().generate({ type: 'nodebuffer' })

    fs.writeFileSync(`modified/source.docx`, docData);

    const guid = uuidv1()

    // Add QR Code into last page
    await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`)
    const document = new Document();
    const image1 = Media.addImage(document, fs.readFileSync('qr.png'), 150, 150, {
      floating: {
        horizontalPosition: {
          align: HorizontalPositionAlign.CENTER,
        },
        verticalPosition: {
          align: VerticalPositionAlign.CENTER,
        },
        behindDocument: true
      },
    });

    let logoimage = "integra-qr.png";
    if (logo_url) {
      await doRequest(logo_url, "qr-logo.png")
      logoimage = "qr-logo.png"
    }
    if (req.files['logo']) {
      const logoFile = req.files['logo'][0];
      logoimage = logoFile.path;
    }

    const image2 = Media.addImage(document, fs.readFileSync(logoimage), 50, 50, {
      floating: {
        horizontalPosition: {
          align: HorizontalPositionAlign.CENTER,
        },
        verticalPosition: {
          // offset: 540000,
          align: VerticalPositionAlign.CENTER,
        },
        behindDocument: false,
      },
    });

    document.addSection({
      children: [
        new Paragraph(image1),
        new Paragraph(image2),
      ],
    });
    const qrdata = await Packer.toBuffer(document)
    fs.writeFileSync("modified/qr.docx", qrdata);

    const inputFile1 = fs.readFileSync('modified/qr.docx');
    const inputFile2 = fs.readFileSync('modified/source.docx');
    const mergedData = await mergeDocx(inputFile1, inputFile2);
    fs.writeFileSync("modified/filled.docx", mergedData);

    /**
     * Unzip docx file
     */
    const directory = await unzipper.Open.file('modified/filled.docx')
    await directory.extract({path: 'modified/unzipped'})

    /**
     * Create new item.mxl
     */
    if (!fs.existsSync("modified/unzipped/customXml")){
      fs.mkdirSync("modified/unzipped/customXml");
    }

    const files = fs.readdirSync('modified/unzipped/customXml');
    const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

    const obj = {
      "@": {
        xmlns: "http://schemas.business-integrity.com/dealbuilder/2006/answers"
      },
      "Variable": []
    };
    Object.keys(meta).forEach(key => {
      obj.Variable.push({
        "@": {
          "Name": key
        },
        "Value": meta[key]
      })
    })
    obj.Variable.push({
      "@": {
        "Name": "infoJSON"
      },
      "Value": JSON.stringify(meta)
    })
    obj.Variable.push({
      "@": {
        "Name": "formJSON"
      },
      "Value": data_form
    })
    obj.Variable.push({
      "@": {
        "Name": "id"
      },
      "Value": guid
    })
    if (master_id) {
      obj.Variable.push({
        "@": {
          "Name": "master_id"
        },
        "Value": master_id
      })
    }

    const xml = js2xmlparser.parse("Session", obj);
    fs.writeFileSync(`modified/unzipped/customXml/item${itemFiles.length + 1}.xml`, xml);

    /**
     * Create docProps/custom.xml
     */
    if (!fs.existsSync("modified/unzipped/docProps/custom.xml")){
      const obj = {
        "@": {
          xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
          "xmlns:vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
        },
        "property": []
      };
      Object.keys(meta).forEach((key, index) => {
        obj.property.push({
          "@": {
            "xmlns": "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
            "fmtid": "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
            "pid": `${index + 2}`,
            "name": key
          },
          "vt:lpwstr": {
            "@": {
              "xmlns:vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
            },
            "#": meta[key]
          }
        })
      })
      const xml = js2xmlparser.parse("Properties", obj);
      fs.writeFileSync("modified/unzipped/docProps/custom.xml", xml);

      // Update [Content_Types].xml
      const a = fs.readFileSync("modified/unzipped/[Content_Types].xml").toString();
      const json = parser.toJson(a, { object: true, reversible: true });
      json.Types.Override.push({
        PartName: "/docProps/custom.xml",
        ContentType: "application/vnd.openxmlformats-officedocument.custom-properties+xml"
      });
      fs.writeFileSync("modified/unzipped/[Content_Types].xml", `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(json)}`);

      const rels = fs.readFileSync("modified/unzipped/_rels/.rels").toString();
      const relsJson = parser.toJson(rels, { object: true, reversible: true });
      relsJson.Relationships.Relationship.push({
        Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",
        Target: "/docProps/custom.xml",
        Id: `rId${relsJson.Relationships.Relationship.length + 1}`
      });
      fs.writeFileSync("modified/unzipped/_rels/.rels", `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(relsJson)}`);
    }

    /**
     * Zip
     */
    const fileName = req.files['file'][0].originalname.substring(0, req.files['file'][0].originalname.length - 5) + '_SmartDoc.docx'
    var buffer = await zipdir('modified/unzipped');
    fs.writeFileSync(`modified/${fileName}`, buffer);

    fs.rmdir('modified/unzipped', { recursive: true }, (err) => {
      if (err) console.log(err)
    })
    fs.unlink('modified/qr.docx', (err) => {
      if (err) console.log(err)
    })
    fs.unlink('modified/source.docx', (err) => {
      if (err) console.log(err)
    })
    fs.unlink('modified/filled.docx', (err) => {
      if (err) console.log(err)
    })
    if (req.files['file'])
      fs.unlink(req.files['file'][0].path, (err) => {
        if (err) console.log(err)
      })

    if (req.files['logo']) {
      fs.unlink(req.files['logo'][0].path, (err) => {
        if (err) console.log(err)
      })
    }

    const encryptedData = await registerIdentity(fileName, guid);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    res.setHeader('file-name', fileName)
    res.setHeader('id', guid)
    res.setHeader('hash', encryptedData)

    res.download('modified/' + fileName, fileName, (err) => {
      fs.unlink(`modified/${fileName}`, (err) => {
        if (err) console.log(err)
      })
    })
  } catch (err) {
    console.log('err', err)
    res.status(err.statusCode || 500).send(err)
  }
})

const doRequest = (url, filename) => {
  const proto = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const file  = fs.createWriteStream(filename)
    const request = proto.get(url, (response) => {
      response.pipe(file);
      file.on("finish", function() {
        file.close(() => {
         resolve(filename);
        });
       });
       file.on("error", function(err) {
        fs.unlink(filename);
        reject(err);
       });
    });

  });
}

const uploadFileToAzure = (fileName) => {
  return new Promise((resolve, reject) => {
    const blobService = azure.createBlobService();
    blobService.createBlockBlobFromLocalFile('docassemble', fileName, `modified/${fileName}`, function(error, result, response) {
      var containerName = 'docassemble';
      var hostName = 'https://doccreationcenter.blob.core.windows.net';
      const url = blobService.getUrl(containerName, fileName, null, hostName);

      if (!error) {
        resolve(url)
      } else {
        reject(error)
      }
    });
  });
}

const deleteAzureBlob = (fileName) => {
  return new Promise((resolve, reject) => {
    const blobService = azure.createBlobService();
    blobService.deleteBlob('docassemble', fileName, function(error, response) {
      if (!error) {
        resolve(true)
      } else {
        reject(error)
      }
    })
  });
}

app.delete('/docassemble', async (req, res) => {
  try {
    await deleteAzureBlob(req.body.name)
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err)
  }
})

app.post('/docassemble', async (req, res) => {
  try {
    const { meta_form, file } = req.body;
    const meta = JSON.parse(meta_form);

    const srcFileName = 'modified/docassemble.pdf'
    const result = await doRequest(file, srcFileName)

    // Create pdf writer
    const writer = hummus.createWriterToModify(srcFileName, {
      modifiedFilePath: 'modified/docassemble_modified.pdf'
    })
    const reader = hummus.createReader(srcFileName)
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary()
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key])
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta))
    const guid = uuidv1()
    infoDictionary.addAdditionalInfoEntry('id', guid)

    // Fill form fields
    meta.id = guid;
    fillForm(writer, meta)

    // Add QR Code into first page
    await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`)
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

    ctx.drawImage(pageWidth - 65, pageHeight - 65, 'integra-qr.png', {
      transformation: {
        width: 30,
        height: 30,
        fit: 'always'
      }
    })
    pageModifier.endContext().writePage()
    pageModifier
      .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
      .endContext().writePage()
    writer.end()


    const originName = file.split('/').pop()

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = originName.substring(0, originName.length - 4) + '_SmartDoc.pdf'
    await renameFileAsync('modified/docassemble_modified.pdf', 'modified/' + fileName)

    const encryptedData = await registerIdentity(fileName, guid);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash')
    res.setHeader('file-name', fileName)
    res.setHeader('id', guid)
    res.setHeader('hash', encryptedData)

    const uploadedUrl = await uploadFileToAzure(fileName)
    res.status(200).json({
      success: true,
      url: uploadedUrl
    });

    fs.unlink(`modified/${fileName}`, (err) => {
      if (err) console.log(err)
    })
    fs.unlink('modified/docassemble.pdf', (err) => {
      if (err) console.log(err)
    })
  } catch (err) {
    console.log(err)
    res.send(err)
  }
})

/**
 * @swagger
 * path:
 *  /QRVerify/{guid}:
 *    get:
 *      description: Check if document(pdf & docx) is already registered by two APIs /pdf and /doc
 *      tags: [Smart Doc]
 *      parameters:
 *        - in: path
 *          name: guid
 *          schema:
 *            type: string
 *          required: true
 *          description: GUID of the file to check
 *      responses:
 *        "200":
 *          description: render success template screen if document is registered, failure template screen if not.
 */

app.get('/QRVerify/:guid', async (req, res) => {
  try {
    const response = await fetch(`${process.env.BLOCKCHAIN_API_URL}/recordexists/${req.params.guid}`, {
      method: 'get',
      headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
      },
    });
    const result = await response.json()
    if (result.exists) {
      res.render('success', {
        identityId: result.data[result.data.length - 1].Record.identityId,
        value: result.data[result.data.length - 1].Record.value,
        metaData: result.data[result.data.length - 1].Record.metaData,
        creationDate: moment(result.data[result.data.length - 1].Record.creationDate).format('LLL'),
      })
    } else {
      res.render('failure')
    }
  } catch (err) {
    res.send(err)
  }
})

/**
 * @swagger
 * path:
 *  /publicKey/{id}:
 *    get:
 *      description: Get public key of the smart document
 *      tags: [Smart Doc]
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *            type: string
 *          required: true
 *          description: GUID of the file
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  exists:
 *                    type: boolean
 *                  publicKey:
 *                    type: string
 *                    description: if `exists` is true, `publicKey` is the public key. if false, doesn't have public key.
 *        "500":
 *          description: Not registered
 */

app.get('/publicKey/:id', async (req, res) => {
  try {
    const response = await fetch(`${process.env.BLOCKCHAIN_API_URL}/keyforowner/` + req.params.id, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
      },
    });
    const responseJson = await response.json();
    if (responseJson.exists) {
      res.status(200).json({
        exists: true,
        publicKey: responseJson.data[responseJson.data.length - 1].Record.keyValue
      });
    } else {
      res.status(200).json({
        exists: false,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
})

/**
 * @swagger
 * path:
 *  /verifyKey/{key}:
 *    post:
 *      description: verify key with the correct encrypted passphrase
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                public_key:
 *                  type: string
 *                  description: public key.
 *                encrypted_passphrase:
 *                  type: string
 *                  description: encrypted pass phrase
 *      parameters:
 *        - in: path
 *          name: key
 *          schema:
 *            type: string
 *          required: true
 *          description: pass key to check
 *      responses:
 *        "200":
 *          description: true if verified, false if not.
 */

app.post('/verifyKey/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const { public_key, encrypted_passphrase } = req.body;
    const pubKey = createPublicKeyObject(public_key);

    const verify = crypto.createVerify('SHA256');
    verify.write(key);
    verify.end();
    const result = verify.verify(pubKey, Buffer.from(encrypted_passphrase, 'base64'));
    res.status(200).json({
      success: result
    })
  } catch (err) {
    res.status(500).json(err);
  }
})

/**
 * @swagger
 * path:
 *  /encryptWithPublicKey:
 *    post:
 *      description: encrypt file with public key
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: file
 *                  description: File to encrypt.
 *                publicKey:
 *                  type: string
 *                  description: public key.
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  AESEncryptedDoc:
 *                    type: string
 *                    description: aes-256 encrypted data
 *                  RSAEncryptedKey:
 *                    type: string
 *                    description: encrypted key
 *                  RSAEncryptedIv:
 *                    type: string
 *                    description: encryped iv
 */

app.post('/encryptWithPublicKey', upload.single('file'), async (req, res) => {
  try {
    const { publicKey } = req.body;
    var toEncrypt = fs.readFileSync(req.file.path, "binary");
    var buffer = Buffer.from(toEncrypt);
    const key = createPublicKeyObject(publicKey);
    const enc = encrypt(buffer);
    const AESEncryptedDoc = enc.encryptedData;
    const RSAEncryptedKey = crypto.publicEncrypt(key, enc.key);
    const RSAEncryptedIv = crypto.publicEncrypt(key, enc.iv);
    const encrypted = {
      AESEncryptedDoc,
      RSAEncryptedKey: RSAEncryptedKey.toString("base64"),
      RSAEncryptedIv: RSAEncryptedIv.toString("base64")
    };

    res.send(encrypted)

    if (req.file)
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err)
      })
  } catch (err) {
    res.send(err)
  }
})

/**
 * @swagger
 * path:
 *  /decryptWithPrivateKey:
 *    post:
 *      description: decrypt file with private key
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: string
 *                  description: encrypted data
 *                privateKey:
 *                  type: string
 *                  description: private key.
 *      responses:
 *        "200":
 *          description: return decrypted file
 */

app.post('/decryptWithPrivateKey', async (req, res) => {
  try {
    const { data, privateKey } = req.body;
    const { AESEncryptedDoc, RSAEncryptedIV, RSAEncryptedKey, filename } = data
    const key = createPrivateKeyObject(privateKey);

    const aes_iv = crypto.privateDecrypt(key, Buffer.from(RSAEncryptedIV, 'base64'));
    const aes_key = crypto.privateDecrypt(key, Buffer.from(RSAEncryptedKey, 'base64'));
    const dec = decrypt({ encryptedData: AESEncryptedDoc, iv: aes_iv, key: aes_key });
    fs.writeFileSync(`modified/${filename}`, dec, 'binary')

    res.setHeader('Access-Control-Expose-Headers', 'file-name')
    res.setHeader('file-name', filename)

    res.download(`modified/${filename}`, filename, (err) => {
      fs.unlink(`modified/${filename}`, (err) => {
        if (err) console.log(err)
      })
    })

  } catch (err) {
    console.log(err)
    res.send(err)
  }
})

app.post('/email', upload.single('file'), async (req, res) => {
  try {
    const { email, name, filename, type } = req.body;
    const attachment = fs.readFileSync(req.file.path).toString("base64");
    let template = '', subject = '';
    if (type === 'IntegraEncrypt') {
      subject = 'New Integra Encrypted Document';
      template = `Hi ${name},<br>
<br>
A document has been encrypted and sent to you using your public cartridge using Integra Blockchain Encryption.  The document has been encrypted using two forms of encryption, RSA and AES, and can only be decrypted using your Integra Private Cartridge document.<br>
<br>
Please visit https://hedgefund.z20.web.core.windows.net/, then select "Individual" and then "Decrypt a Document".<br>
<br>
The attached file will dragged onto the left hand side of the screen and on the right hand side you will drag your Integra Private Cartridge and be asked to enter your Passphrase.  Once verified, the decrypted document will be available for download and viewing in your browser.<br>
<br>
Thank you from the entire Integra Team for trusting your document security with us!`;
    } else if (type === 'HedgeFund') {
      subject = 'New Subscription Agreement Document';
      template = `Hi ${name},<br>
<br>
A new subscription agreement document has been generated using the Integra Hedge Fund Application.  The attached document has been encrypted for security of the information contained within the document.<br>
<br>
To decrypt the document, please go to https://hedgefund.z20.web.core.windows.net/, click "Individual", then click on "Decrypt a Document".  In order to decrypt this document make sure to have your private key attesation document available.<br>
<br>
Thanks,<br>
David`;
    }
    const msg = {
      to: email,
      from: 'no-reply@integraledger.com',
      subject,
      html: template,
      attachments: [
        {
          content: attachment,
          filename,
          type: "application/pdf",
          disposition: "attachment"
        }
      ]
    };

    await sgMail.send(msg)
    res.send({success: true})
    if (req.file)
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err)
      })
  } catch (err) {
    res.send(err)
  }
})

app.post('/readFile', upload.single('file'), (req, res) => {
  var filecontent = "";
  fs.readFile(req.file.path, async (err, data) => {
      let filePath = req.file.path;
      let filebuffer = data;
      let filename = req.file.originalname;
      var fileextension = filereader.getFileExtension(filename);
      switch (fileextension) {
        case '.pdf':
          new PdfReader().parseBuffer(filebuffer, function (err, item) {
              if (err) console.log(err);
              else if (!item) console.log(item);
              else if (item.text) {
                  filecontent = filecontent + " " + item.text;
              }
          });
          break;
        case '.doc':
        case '.docx':
          const docRes = await filereader.extract(filePath);
          filecontent = docRes;
          break;
        case '.xlsx':
        case '.xls':
          var result = {};
          data = new Uint8Array(data);
          var workbook = XLSX.read(data, {
              type: 'array'
          });
          workbook.SheetNames.forEach(function (sheetName) {
              var roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                  header: 1
              });
              if (roa.length) result[sheetName] = roa;
          });
          filecontent = JSON.stringify(result);
          break;
        case '.txt':
        case '.csv':
          filecontent = data;
          break;
        default:
          filecontent = filename;
      }
      res.send(filecontent)
  });
});

app.get('/verification', async (req, res) => {
  try {

    const resource = Stripe.StripeResource.extend({
      request: Stripe.StripeResource.method({
        method: 'POST',
        path: 'identity/verification_intents',
      })
    });

    new resource(stripe).request({
      'return_url': `${process.env.WEB_URL}/id-verification?vi={VERIFICATION_INTENT_ID}`,
      'requested_verifications': [
        'identity_document',
      ]
    },
      function(err, response) {
        res.send({ id: response.id, url: response.next_action.redirect_to_url })
      }
    );

  } catch (err) {
    console.log(err)
    res.send(err)
  }
})

app.get('/verification/:id', async (req, res) => {
  try {
    const verification_intent_id = req.params.id;

    const resource = stripe.StripeResource.extend({
      request: stripe.StripeResource.method({
        method: 'POST',
        path: `identity/verification_intents/${verification_intent_id}`,
      })
    });

    new resource(stripe).request({
    },
      function(err, response) {
        res.send(response);
      }
    );

  } catch (err) {
    console.log(err)
    res.send(err)
  }
})

app.get('/checkFile', (req, res) => {

  try {
    res.render('checkfile')
  } catch (err) {
    res.send(err)
  }
})

app.get('/', (req, res) => {
  res.send(`Integra API (Blockchain API: ${process.env.BLOCKCHAIN_API_URL})`)
});

// app.post("/webhooks", async (req, res) => {
//   try {
//     console.log("/webhooks POST route hit! req.body: ", req.body)
//     const event = req.body
//     res.send(event)
//   }
//   catch (err) {
//       console.log("/webhooks route error: ", err)
//       res.send(400)
//   }
// })

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Integra Backend API with Swagger",
      version: "0.1.0",
      description:
        "This is a Integra Backend API with Swagger",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
      contact: {
        name: "Integra",
        url: "https://cartridge.integraledger.com/",
        email: "oleksandr.exp@gmail.com",
      },
    },
  },
  apis: ["./app.js", "./routes/api/forms.js"],
};

const specs = swaggerJsdoc(options);
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('Listening on port ' + port + '!')
})
