require('dotenv').config();
const express = require('express')
const QRCode = require('qrcode')
const cors = require('cors')
const fetch = require('node-fetch')
const crypto = require('crypto')
const algorithm = 'aes-256-cbc';
const fs = require('fs')
const { promisify } = require('util')
const renameFileAsync = promisify(fs.rename)
const readFileAsync = promisify(fs.readFile)
// const writeFileAsync = promisify(fs.writeFile)
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
const Schema = mongoose.Schema
const QRSchema = new Schema({
  guid: String,
  hash: String,
})
const QRModel = mongoose.model('QR', QRSchema);
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-03-02; identity_beta=v3',
});

const app = express()
app.use(cors())
app.use( bodyParser.json({limit: '25mb'}) );
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');

// Connect to mongodb
// old db
//const uri = 'mongodb+srv://dbIntegra:password22@cluster0-qqiiz.azure.mongodb.net/integra?retryWrites=true&w=majority';

// new  atlas db
const uri = 'mongodb+srv://e-signature:IMG_Fo_5javHuwJ.m687gV-eX0-4Ox.q@cluster0.tsovs.azure.mongodb.net/dbIntegra?ssl=true&retryWrites=true';

mongoose.connect(uri, {
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
  const response = await fetch(`${process.env.API_URL}/valueexists/` + data, {
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

const registerIdentity = async fileName => {
  // SHA-256 hash file
  const fileData = await readFileAsync('modified/' + fileName);
  const encryptedData = crypto.createHash('sha256')
    .update(fileData)
    .digest('hex');
  await fetch(`${process.env.API_URL}/registerIdentity`, {
    method: 'post',
    body: JSON.stringify({
      'identityType': 'com.integraledger.lmatid',
      'metaData': 'esign by mike',
      'value': encryptedData,
      'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY
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
    const { master_id, cartridge_type: cartridgeType, meta_form, data_form } = req.body;
    const meta = JSON.parse(meta_form);
    const pass_phrase = meta.pass_phrase
    delete meta.pass_phrase
    let readingFileName = (cartridgeType !== 'Organization' && cartridgeType !== 'Personal' && cartridgeType !== 'Encrypt') ? 'CartridgeGeneric' : cartridgeType;

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

      const registerKeyRes = await fetch(`${process.env.API_URL}/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
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
    // Fill form fields
    meta.id = guid;
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
    const fileName = req.file ? req.file.originalname.substring(0, req.file.originalname.length - 4) + '_SmartDoc.pdf' : `${readingFileName}_Cartridge.pdf`
    await renameFileAsync('modified/' + (req.file ? req.file.filename : `${readingFileName}.pdf`), 'modified/' + fileName)

    const encryptedData = await registerIdentity(fileName);

    if (!isHedgePublic) {
      // Store GUID and Hash to MongoDB
      const instance = new QRModel()
      instance.guid = guid
      instance.hash = encryptedData
      instance.save()
    }

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
    res.send(err)
  }
})

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

    const encryptedData = await registerIdentity(fileName);

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

    res.download('modified/' + fileName, fileName, (err) => {
      fs.unlink(`modified/${fileName}`, (err) => {
        if (err) console.log(err)
      })
    })
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
      const responseJson = await getValue(qrData.hash)
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

app.get('/publicKey/:id', async (req, res) => {
  try {
    const response = await fetch(`${process.env.API_URL}/keyforowner/` + req.params.id, {
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
        publicKey: responseJson.data[0].Record.keyValue
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

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('Listening on port ' + port + '!')
})
