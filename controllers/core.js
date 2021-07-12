/* eslint-disable newline-per-chained-call */
/* eslint-disable no-throw-literal */
const QRCode = require('qrcode');
const fetch = require('node-fetch');
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const unzipper = require('unzipper');
const zipdir = require('zip-dir');
const parser = require('xml2json');
const js2xmlparser = require('js2xmlparser');
const fs = require('fs');
const http = require('http');
const https = require('https');
const azure = require('azure-storage');

const { promisify } = require('util');

const renameFileAsync = promisify(fs.rename);
const readFileAsync = promisify(fs.readFile);
const HummusRecipe = require('hummus-recipe');
const hummus = require('hummus');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const JSZip = require('jszip');
const { createCanvas, loadImage } = require('canvas');
const ImageModule = require('docxtemplater-image-module-free');

const opts = {};
opts.centered = false;
opts.fileType = 'docx';
opts.getImage = function (tagValue, tagName) {
  return fs.readFileSync(tagValue);
};
opts.getSize = function (img, tagValue, tagName) {
  return [200, 200];
};
const libre = require('libreoffice-convert');

const libreConvertAsync = promisify(libre.convert);

const { PdfReader } = require('pdfreader');
const XLSX = require('xlsx');

const uuidv1 = require('uuid/v1');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-03-02; identity_beta=v3' });
const filereader = require('../filereader');
const { fillForm } = require('../pdf-form-fill');

const isProd = process.env.APP_ENV === 'production';

const BLOCKCHAIN_API_URL = isProd ? 'https://integraledger.azure-api.net/api/v1.5' : 'https://productionapis.azure-api.net';

const getValue = async (data, subscriptionKey) => {
  const response = await fetch(`${BLOCKCHAIN_API_URL}/valueexists/${data}`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });
  const result = await response.json();
  return result;
};

const encryptStringWithRsaPrivateKey = (toEncrypt, privateKey) => {
  const sign = crypto.createSign('SHA256');
  sign.update(toEncrypt);
  sign.end();
  const signature = sign.sign(privateKey);
  return signature.toString('base64');
};

const registerIdentity = async (fileName, guid, subscriptionKey, opt1 = '') => {
  // SHA-256 hash file
  const fileData = await readFileAsync(`modified/${fileName}`);
  const encryptedData = crypto.createHash('sha256').update(fileData).digest('hex');
  const response = await fetch(`${BLOCKCHAIN_API_URL}/registerIdentity`, {
    method: 'post',
    body: JSON.stringify({
      identityType: 'com.integraledger.lmatid',
      metaData: 'Integra Smart Document',
      value: encryptedData,
      recordId: guid,
      opt1,
      opt2: '',
      opt3: '',
    }),
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });
  const result = await response.json();
  if (result.statusCode === 401) {
    throw { statusCode: 401, message: result.message };
  }
  return encryptedData;
};

const createPublicKeyObject = publicKey => {
  const pkhead = '-----BEGIN RSA PUBLIC KEY-----';
  const pkfooter = '-----END RSA PUBLIC KEY-----';

  let pubkey = publicKey.replace(/\\n/g, '\n');
  let fmt = 'der';
  if (pubkey.includes(pkhead)) {
    fmt = 'pem';
  }
  pubkey = pubkey.replace(pkhead, '');
  pubkey = pubkey.replace(pkfooter, 'pkfooter');
  pubkey = pubkey.split(' ').join('+');
  pubkey = pubkey.replace('pkfooter', pkfooter);
  pubkey = pkhead + pubkey;
  const keyData = {
    key: pubkey,
    format: fmt,
    padding: crypto.constants.RSA_NO_PADDING,
  };
  if (fmt === 'der') keyData.type = 'pkcs1';
  return crypto.createPublicKey(keyData);
};

const createPrivateKeyObject = privateKey => {
  const pkhead = '-----BEGIN RSA PRIVATE KEY-----';
  const pkfooter = '-----END RSA PRIVATE KEY-----';

  let privkey = privateKey.replace(/\\n/g, '\n'); // Incoming public key
  let fmt = 'der';
  if (privkey.includes(pkhead)) {
    fmt = 'pem';
  }
  privkey = privkey.replace(pkhead, '');
  privkey = privkey.replace(pkfooter, 'pkfooter');
  privkey = privkey.split(' ').join('+');
  privkey = privkey.replace('pkfooter', pkfooter);
  privkey = pkhead + privkey;
  const keyData = {
    key: privkey,
    format: fmt,
    padding: crypto.constants.RSA_NO_PADDING,
  };
  if (fmt === 'der') keyData.type = 'pkcs1';
  return crypto.createPrivateKey(keyData);
};

const encrypt = text => {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { key, iv, encryptedData: encrypted.toString('hex') };
};

const decrypt = text => {
  const iv = Buffer.from(text.iv, 'hex');
  const encryptedText = Buffer.from(text.encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(text.key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

const doRequest = (url, filename) => {
  const proto = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    proto.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve(filename);
        });
      });
      file.on('error', err => {
        fs.unlink(filename);
        reject(err);
      });
    });
  });
};

const uploadFileToAzure = (containerName, filePath, fileName) =>
  new Promise((resolve, reject) => {
    const blobService = azure.createBlobService();
    blobService.createBlockBlobFromLocalFile(containerName, fileName, filePath, (error, result, response) => {
      const hostName = 'https://doccreationcenter.blob.core.windows.net';
      const url = blobService.getUrl(containerName, fileName, null, hostName);

      if (!error) {
        resolve(url);
      } else {
        reject(error);
      }
    });
  });

const deleteAzureBlob = (containerName, fileName) =>
  new Promise((resolve, reject) => {
    const blobService = azure.createBlobService();
    blobService.deleteBlob(containerName, fileName, (error, response) => {
      if (!error) {
        resolve(true);
      } else {
        reject(error);
      }
    });
  });

const getFilledDocData = (path, meta) => {
  // Fill merge fields
  const content = fs.readFileSync(path, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater();

  doc.loadZip(zip);
  doc.setData(meta);
  doc.render();
  const data = doc.getZip().generate({ type: 'nodebuffer' });
  return data;
};

const getHeaderTextAddedDoc = async docData => {
  const originZip = await JSZip.loadAsync(docData);

  const originDocumentFile = originZip.file(/^word\/document[0-9]*.xml$/)[0];
  let originDocumentXml = await originDocumentFile.async('string');
  const startIndex = originDocumentXml.indexOf('<w:body>') + 8;
  originDocumentXml =
    // eslint-disable-next-line prefer-template
    originDocumentXml.slice(0, startIndex) +
    '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">{%image}</w:t></w:r></w:p>' +
    originDocumentXml.slice(startIndex);
  originZip.file(originDocumentFile.name, originDocumentXml);

  const updatedData = await originZip.generateAsync({ type: 'nodebuffer' });
  return updatedData;
};

const generateQRData = async (guid, logoPath) => {
  const canvas = createCanvas(200, 200);
  QRCode.toCanvas(canvas, `${process.env.API_URL}/QRVerify/${guid}`, {
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const ctx = canvas.getContext('2d');
  const img = await loadImage(logoPath);
  ctx.drawImage(img, 75, 75, 50, 50);
  fs.writeFileSync('qr.png', canvas.toBuffer());
};

exports.analyze = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const fileData = await readFileAsync(req.file.path);
    const encryptedData = crypto.createHash('sha256').update(fileData).digest('hex');
    const responseJson = await getValue(encryptedData, subscription_key);
    if (responseJson.statusCode === 401) {
      return res.status(401).send({ message: responseJson.message });
    }
    let result = {};
    if (responseJson.exists) {
      const pdfDoc = new HummusRecipe(req.file.path);
      const info = pdfDoc.info();
      result = {
        result: info,
        creationDate: responseJson.data[responseJson.data.length - 1].Record.creationDate,
      };
    } else {
      result = { result: false };
    }
    fs.unlinkSync(req.file.path);
    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.analyzeDocx = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const fileData = await readFileAsync(req.file.path);
    const encryptedData = crypto.createHash('sha256').update(fileData).digest('hex');
    const responseJson = await getValue(encryptedData, subscription_key);
    if (responseJson.statusCode === 401) {
      return res.status(401).send({ message: responseJson.message });
    }
    let result = {};
    if (responseJson.exists) {
      // Unzip docx file
      const directory = await unzipper.Open.file(req.file.path);
      const unzippedName = uuidv1();
      await directory.extract({ path: `modified/${unzippedName}` });

      const files = fs.readdirSync(`modified/${unzippedName}/customXml`);
      const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

      let index = itemFiles.length;
      const meta = {};
      while (index >= 0) {
        const a = fs.readFileSync(`modified/${unzippedName}/customXml/item${index}.xml`).toString();
        const json = parser.toJson(a, { object: true });
        if (json.Session && json.Session.xmlns === 'http://schemas.business-integrity.com/dealbuilder/2006/answers') {
          const specialKeys = [];
          json.Session.Variable &&
            json.Session.Variable.reduce((acc, cur) => {
              if (acc[cur.Name]) {
                if (specialKeys.findIndex(elem => elem === cur.Name) === -1) specialKeys.push(cur.Name);
                if (acc[cur.Name] instanceof Array) acc[cur.Name].push(cur.Value);
                else acc[cur.Name] = [acc[cur.Name], cur.Value];
              } else acc[cur.Name] = cur.Value;
              return acc;
            }, meta);
          specialKeys.forEach(key => {
            meta[key].forEach((val, ind) => {
              meta[`${key}${ind + 1}`] = val;
            });
            delete meta[key];
          });
          break;
        } else {
          index--;
        }
      }

      fs.rmdirSync(`modified/${unzippedName}`, { recursive: true });
      result = {
        result: meta,
        creationDate: responseJson.data[responseJson.data.length - 1].Record.creationDate,
      };
    } else {
      result = { result: false };
    }
    fs.unlinkSync(req.file.path);

    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.analyzeDocxNohash = async (req, res) => {
  try {
    // Unzip docx file
    const directory = await unzipper.Open.file(req.file.path);
    const unzippedName = uuidv1();
    await directory.extract({ path: `modified/${unzippedName}` });

    const files = fs.readdirSync(`modified/${unzippedName}/customXml`);
    const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

    let index = itemFiles.length;
    const meta = {};
    while (index >= 0) {
      const a = fs.readFileSync(`modified/${unzippedName}/customXml/item${index}.xml`).toString();
      const json = parser.toJson(a, { object: true });
      if (json.Session && json.Session.xmlns === 'http://schemas.business-integrity.com/dealbuilder/2006/answers') {
        const specialKeys = [];
        json.Session.Variable &&
          json.Session.Variable.reduce((acc, cur) => {
            if (acc[cur.Name]) {
              if (specialKeys.findIndex(elem => elem === cur.Name) === -1) specialKeys.push(cur.Name);
              if (acc[cur.Name] instanceof Array) acc[cur.Name].push(cur.Value);
              else acc[cur.Name] = [acc[cur.Name], cur.Value];
            } else acc[cur.Name] = cur.Value;
            return acc;
          }, meta);
        specialKeys.forEach(key => {
          meta[key].forEach((val, ind) => {
            meta[`${key}${ind + 1}`] = val;
          });
          delete meta[key];
        });
        break;
      } else {
        index--;
      }
    }

    fs.rmdirSync(`modified/${unzippedName}`, { recursive: true });
    const result = {
      result: meta,
      // creationDate: responseJson.data[responseJson.data.length - 1].Record.creationDate,
    };

    fs.unlinkSync(req.file.path);

    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.pdf = async (req, res) => {
  try {
    const { master_id, cartridge_type: cartridgeType, meta_form, data_form, hide_qr } = req.body;
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const meta = JSON.parse(meta_form);
    const { pass_phrase } = meta;
    delete meta.pass_phrase;
    let readingFileName =
      cartridgeType !== 'Organization' &&
      cartridgeType !== 'Personal' &&
      cartridgeType !== 'Encrypt' &&
      cartridgeType !== 'Purchaser' &&
      cartridgeType !== 'Vendor' &&
      cartridgeType !== 'VendorContract' &&
      cartridgeType !== 'PurchaseOrder' &&
      cartridgeType !== 'Invoice'
        ? 'CartridgeGeneric'
        : cartridgeType;

    const isHedgePublic = req.query.type === 'hedgefund' && cartridgeType === 'Personal' && req.query.private_id;
    if (req.query.type === 'hedgefund' && cartridgeType === 'Personal') {
      readingFileName = 'Personal_Private';
      if (req.query.private_id) readingFileName = 'Personal_Public';
    }

    // Create pdf writer
    const writer = hummus.createWriterToModify(req.file ? req.file.path : `templates/${readingFileName}.pdf`, {
      modifiedFilePath: `modified/${req.file ? req.file.filename : `${readingFileName}.pdf`}`,
    });
    const reader = hummus.createReader(req.file ? req.file.path : `templates/${readingFileName}.pdf`);
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary();
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key]);
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta));
    infoDictionary.addAdditionalInfoEntry('formJSON', data_form);
    const guid = !isHedgePublic ? uuidv1() : req.query.private_id;
    infoDictionary.addAdditionalInfoEntry('id', guid);
    if (master_id) infoDictionary.addAdditionalInfoEntry('master_id', master_id);
    if (cartridgeType && cartridgeType === 'Personal' && !isHedgePublic) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      const pubkeyString = publicKey.export({ type: 'pkcs1', format: 'pem' });
      const privkeyString = privateKey.export({ type: 'pkcs1', format: 'pem' });

      const response = await fetch(`${BLOCKCHAIN_API_URL}/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscription_key,
        },
      });
      const result = await response.json();
      if (result.statusCode === 401) {
        throw { statusCode: 401, message: result.message };
      }
      const encrypted = encryptStringWithRsaPrivateKey(pass_phrase, privateKey);
      infoDictionary.addAdditionalInfoEntry('encrypted_passphrase', encrypted);
      infoDictionary.addAdditionalInfoEntry('private_key', privkeyString);
    }
    if (cartridgeType && (cartridgeType === 'Purchaser' || cartridgeType === 'Vendor')) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      const pubkeyString = publicKey.export({ type: 'pkcs1', format: 'pem' });
      const privkeyString = privateKey.export({ type: 'pkcs1', format: 'pem' });

      const response = await fetch(`${BLOCKCHAIN_API_URL}/registerKey?identityId=${guid}&keyValue=${pubkeyString}&owner=${guid}`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscription_key,
        },
      });
      const result = await response.json();
      if (result.statusCode === 401) {
        throw { statusCode: 401, message: result.message };
      }
      infoDictionary.addAdditionalInfoEntry('private_key', privkeyString);
    }
    // Fill form fields
    meta.id = guid;
    fillForm(writer, meta);

    if (!hide_qr) {
      // Add QR Code into first page
      await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`);
      const pageBox = reader.parsePage(0).getMediaBox();
      const pageWidth = pageBox[2] - pageBox[0];
      const pageHeight = pageBox[3] - pageBox[1];
      const pageModifier = new hummus.PDFPageModifier(writer, 0, true);
      const ctx = pageModifier.startContext().getContext();
      ctx.drawImage(pageWidth - 100, pageHeight - 100, 'qr.png', {
        transformation: {
          width: 100,
          height: 100,
          fit: 'always',
        },
      });

      if (req.file && meta.organization_logo) {
        const base64Data = meta.organization_logo.split(',')[1];
        await fs.writeFileSync('qr-logo.png', base64Data, {
          encoding: 'base64',
        });
      }

      ctx.drawImage(pageWidth - 65, pageHeight - 65, req.file && meta.organization_logo ? 'qr-logo.png' : 'integra-qr.png', {
        transformation: {
          width: 30,
          height: 30,
          fit: 'always',
        },
      });
      pageModifier.endContext().writePage();
      pageModifier
        .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
        .endContext()
        .writePage();
    }
    writer.end();

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = req.file
      ? `${req.file.originalname.substring(0, req.file.originalname.length - 4)}_SmartDoc.pdf`
      : `${readingFileName}_Cartridge.pdf`;
    await renameFileAsync(`modified/${req.file ? req.file.filename : `${readingFileName}.pdf`}`, `modified/${fileName}`);

    const encryptedData = await registerIdentity(fileName, guid, subscription_key, cartridgeType && cartridgeType === 'Vendor' ? guid : '');

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash');
    let finalFileName;
    if (req.file) finalFileName = fileName;
    else {
      if (cartridgeType === 'Organization') finalFileName = `${meta.organization_name} Key.pdf`;
      else if (cartridgeType === 'Personal') finalFileName = `${meta.given_name} ${meta.family_name} Key.pdf`;
      else if (cartridgeType === 'Encrypt') finalFileName = 'Encrypt.pdf';
      else finalFileName = `${cartridgeType}.pdf`;

      if (req.query.type === 'hedgefund' && cartridgeType === 'Personal') finalFileName = `${readingFileName}.pdf`;
    }
    res.setHeader('file-name', finalFileName);
    res.setHeader('id', guid);
    if (!isHedgePublic) {
      res.setHeader('hash', encryptedData);
    }

    res.download(`modified/${fileName}`, fileName, () => {
      fs.unlinkSync(`modified/${fileName}`);
    });
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  } catch (err) {
    console.log(err);
    res.status(err.statusCode || 500).send(err);
  }
};

exports.doc = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const { master_id, meta_form, data_form, hide_qr } = req.body;

    const meta = JSON.parse(meta_form);

    const docData = getFilledDocData(req.file.path, meta);

    // Convert word document to pdf
    const pdfData = await libreConvertAsync(docData, '.pdf', undefined);
    fs.writeFileSync(req.file.path, pdfData);

    // Create pdf writer
    const writer = hummus.createWriterToModify(req.file.path, {
      modifiedFilePath: `modified/${req.file.filename}`,
    });
    const reader = hummus.createReader(req.file.path);

    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary();
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key]);
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta));
    infoDictionary.addAdditionalInfoEntry('formJSON', data_form);
    const guid = uuidv1();
    infoDictionary.addAdditionalInfoEntry('id', guid);
    if (master_id) infoDictionary.addAdditionalInfoEntry('master_id', master_id);

    if (!hide_qr) {
      // Add QR Code into first page
      await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`);
      const pageBox = reader.parsePage(0).getMediaBox();
      const pageWidth = pageBox[2] - pageBox[0];
      const pageHeight = pageBox[3] - pageBox[1];
      const pageModifier = new hummus.PDFPageModifier(writer, 0, true);
      const ctx = pageModifier.startContext().getContext();
      ctx.drawImage(pageWidth - 100, pageHeight - 100, 'qr.png', {
        transformation: {
          width: 100,
          height: 100,
          fit: 'always',
        },
      });

      if (meta.organization_logo) {
        const base64Data = meta.organization_logo.split(',')[1];
        await fs.writeFileSync('qr-logo.png', base64Data, {
          encoding: 'base64',
        });
      }

      ctx.drawImage(pageWidth - 65, pageHeight - 65, meta.organization_logo ? 'qr-logo.png' : 'integra-qr.png', {
        transformation: {
          width: 30,
          height: 30,
          fit: 'always',
        },
      });
      pageModifier.endContext().writePage();
      pageModifier
        .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
        .endContext()
        .writePage();
    }
    writer.end();

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = `${req.file.originalname.substring(0, req.file.originalname.length - 4)}_SmartDoc.pdf`;
    await renameFileAsync(`modified/${req.file.filename}`, `modified/${fileName}`);

    const encryptedData = await registerIdentity(fileName, guid, subscription_key);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash');
    res.setHeader('file-name', fileName);
    res.setHeader('id', guid);
    res.setHeader('hash', encryptedData);

    res.download(`modified/${fileName}`, fileName, err => {
      fs.unlinkSync(`modified/${fileName}`);
    });
    fs.unlinkSync(req.file.path);
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.docxSmartdoc = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const { master_id, meta_form, data_form, logo, hide_qr } = req.body;

    const meta = JSON.parse(meta_form);

    const docData = getFilledDocData(req.files.file[0].path, meta);

    const guid = uuidv1();

    let mergedData;
    if (!hide_qr) {
      let logoimage = 'integra-qr.png';
      if (logo) {
        await doRequest(logo, 'qr-logo.png');
        logoimage = 'qr-logo.png';
      }
      if (req.files.logo) {
        const logoFile = req.files.logo[0];
        logoimage = logoFile.path;
      }

      await generateQRData(guid, logoimage);

      const headerAddedData = await getHeaderTextAddedDoc(docData);
      const zip = new PizZip(headerAddedData);
      const imageModule = new ImageModule(opts);
      const doc = new Docxtemplater().attachModule(imageModule).loadZip(zip).setData({ image: 'qr.png' }).render();

      mergedData = doc.getZip().generate({ type: 'nodebuffer' });
    }
    fs.writeFileSync('modified/filled.docx', hide_qr ? docData : mergedData);

    // Unzip docx file
    const directory = await unzipper.Open.file('modified/filled.docx');
    const unzippedName = uuidv1();
    await directory.extract({ path: `modified/${unzippedName}` });

    /**
     * Create new item.mxl
     */
    if (!fs.existsSync(`modified/${unzippedName}/customXml`)) {
      fs.mkdirSync(`modified/${unzippedName}/customXml`);
    }

    const files = fs.readdirSync(`modified/${unzippedName}/customXml`);
    const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

    const obj = {
      '@': { xmlns: 'http://schemas.business-integrity.com/dealbuilder/2006/answers' },
      Variable: [],
    };
    Object.keys(meta).forEach(key => {
      obj.Variable.push({
        '@': { Name: key },
        Value: meta[key],
      });
    });
    obj.Variable.push({
      '@': { Name: 'infoJSON' },
      Value: JSON.stringify(meta),
    });
    obj.Variable.push({
      '@': { Name: 'formJSON' },
      Value: data_form,
    });
    obj.Variable.push({
      '@': { Name: 'id' },
      Value: guid,
    });
    if (master_id) {
      obj.Variable.push({
        '@': { Name: 'master_id' },
        Value: master_id,
      });
    }

    const xml = js2xmlparser.parse('Session', obj);
    fs.writeFileSync(`modified/${unzippedName}/customXml/item${itemFiles.length + 1}.xml`, xml);

    /**
     * Create docProps/custom.xml
     */
    const isCustomXMLExist = fs.existsSync(`modified/${unzippedName}/docProps/custom.xml`);
    const customObj = {
      '@': {
        xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
        'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
      },
      property: [],
    };
    Object.keys(meta).forEach((key, index) => {
      customObj.property.push({
        '@': {
          xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
          fmtid: '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}',
          pid: `${index + 2}`,
          name: key,
        },
        'vt:lpwstr': {
          '@': {
            'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
          },
          '#': meta[key],
        },
      });
    });
    const customXml = js2xmlparser.parse('Properties', customObj);
    fs.writeFileSync(`modified/${unzippedName}/docProps/custom.xml`, customXml);
    if (!isCustomXMLExist) {
      // Update [Content_Types].xml
      const a = fs.readFileSync(`modified/${unzippedName}/[Content_Types].xml`).toString();
      const json = parser.toJson(a, { object: true, reversible: true });
      json.Types.Override.push({
        PartName: '/docProps/custom.xml',
        ContentType: 'application/vnd.openxmlformats-officedocument.custom-properties+xml',
      });
      fs.writeFileSync(`modified/${unzippedName}/[Content_Types].xml`, `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(json)}`);

      const rels = fs.readFileSync(`modified/${unzippedName}/_rels/.rels`).toString();
      const relsJson = parser.toJson(rels, { object: true, reversible: true });
      relsJson.Relationships.Relationship.push({
        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties',
        Target: '/docProps/custom.xml',
        Id: `rId${relsJson.Relationships.Relationship.length + 1}`,
      });
      fs.writeFileSync(`modified/${unzippedName}/_rels/.rels`, `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(relsJson)}`);
    }

    /**
     * Zip
     */
    const fileName = `${req.files.file[0].originalname.substring(0, req.files.file[0].originalname.length - 5)}_SmartDoc.docx`;
    const buffer = await zipdir(`modified/${unzippedName}`);
    fs.writeFileSync(`modified/${fileName}`, buffer);

    fs.rmdirSync(`modified/${unzippedName}`, { recursive: true });
    fs.unlinkSync('modified/filled.docx');
    if (req.files.file) {
      fs.unlinkSync(req.files.file[0].path);
    }

    if (req.files.logo) {
      fs.unlinkSync(req.files.logo[0].path);
    }

    const encryptedData = await registerIdentity(fileName, guid, subscription_key);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash');
    res.setHeader('file-name', fileName);
    res.setHeader('id', guid);
    res.setHeader('hash', encryptedData);

    res.download(`modified/${fileName}`, fileName, () => {
      fs.unlinkSync(`modified/${fileName}`);
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.docxSmartDocAutoOpen = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const { master_id, meta_form, data_form, logo, hide_qr } = req.body;

    const meta = JSON.parse(meta_form);

    const docData = getFilledDocData(req.files.file[0].path, meta);

    const guid = uuidv1();

    let mergedData;
    if (!hide_qr) {
      let logoimage = 'integra-qr.png';
      if (logo) {
        await doRequest(logo, 'qr-logo.png');
        logoimage = 'qr-logo.png';
      }
      if (req.files.logo) {
        const logoFile = req.files.logo[0];
        logoimage = logoFile.path;
      }

      await generateQRData(guid, logoimage);

      const headerAddedData = await getHeaderTextAddedDoc(docData);
      const zip = new PizZip(headerAddedData);
      const imageModule = new ImageModule(opts);
      const doc = new Docxtemplater().attachModule(imageModule).loadZip(zip).setData({ image: 'qr.png' }).render();

      mergedData = doc.getZip().generate({ type: 'nodebuffer' });
    }
    fs.writeFileSync('modified/filled.docx', hide_qr ? docData : mergedData);

    // Unzip docx file
    const directory = await unzipper.Open.file('modified/filled.docx');
    const unzippedName = uuidv1();
    await directory.extract({ path: `modified/${unzippedName}` });

    /**
     * Create new item.mxl
     */
    if (!fs.existsSync(`modified/${unzippedName}/customXml`)) {
      fs.mkdirSync(`modified/${unzippedName}/customXml`);
    }

    const files = fs.readdirSync(`modified/${unzippedName}/customXml`);
    const itemFiles = files.filter(item => /^item\d+\.xml$/i.test(item));

    const obj = {
      '@': { xmlns: 'http://schemas.business-integrity.com/dealbuilder/2006/answers' },
      Variable: [],
    };
    Object.keys(meta).forEach(key => {
      obj.Variable.push({
        '@': { Name: key },
        Value: meta[key],
      });
    });
    obj.Variable.push({
      '@': { Name: 'infoJSON' },
      Value: JSON.stringify(meta),
    });
    obj.Variable.push({
      '@': { Name: 'formJSON' },
      Value: data_form,
    });
    obj.Variable.push({
      '@': { Name: 'id' },
      Value: guid,
    });
    if (master_id) {
      obj.Variable.push({
        '@': { Name: 'master_id' },
        Value: master_id,
      });
    }

    const xml = js2xmlparser.parse('Session', obj);
    fs.writeFileSync(`modified/${unzippedName}/customXml/item${itemFiles.length + 1}.xml`, xml);

    /**
     * Create docProps/custom.xml
     */
    const customObj = {
      '@': {
        xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
        'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
      },
      property: [],
    };
    Object.keys(meta).forEach((key, index) => {
      customObj.property.push({
        '@': {
          xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
          fmtid: '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}',
          pid: `${index + 2}`,
          name: key,
        },
        'vt:lpwstr': {
          '@': {
            'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
          },
          '#': meta[key],
        },
      });
    });
    const customXml = js2xmlparser.parse('Properties', customObj);
    fs.writeFileSync(`modified/${unzippedName}/docProps/custom.xml`, customXml);
    // Update [Content_Types].xml
    const a = fs.readFileSync(`modified/${unzippedName}/[Content_Types].xml`).toString();
    const json = parser.toJson(a, { object: true, reversible: true });
    [
      {
        PartName: '/docProps/custom.xml',
        ContentType: 'application/vnd.openxmlformats-officedocument.custom-properties+xml',
      },
      {
        PartName: '/word/webextensions/taskpanes.xml',
        ContentType: 'application/vnd.ms-office.webextensiontaskpanes+xml',
      },
      {
        PartName: '/word/webextensions/webextension.xml',
        ContentType: 'application/vnd.ms-office.webextension+xml',
      },
    ].forEach(item => {
      if (json.Types.Override.findIndex(o => o.PartName === item.PartName) === -1) {
        json.Types.Override.push(item);
      }
    });
    fs.writeFileSync(`modified/${unzippedName}/[Content_Types].xml`, `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(json)}`);

    const rels = fs.readFileSync(`modified/${unzippedName}/_rels/.rels`).toString();
    const relsJson = parser.toJson(rels, { object: true, reversible: true });
    const taskpaneId = uuidv1();
    [
      {
        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties',
        Target: '/docProps/custom.xml',
        Id: `rId${relsJson.Relationships.Relationship.length + 1}`,
      },
      {
        Type: 'http://schemas.microsoft.com/office/2011/relationships/webextensiontaskpanes',
        Target: '/word/webextensions/taskpanes.xml',
        Id: taskpaneId,
      },
    ].forEach(item => {
      if (relsJson.Relationships.Relationship.findIndex(r => r.Type === item.Type) === -1) {
        relsJson.Relationships.Relationship.push(item);
      }
    });
    fs.writeFileSync(`modified/${unzippedName}/_rels/.rels`, `<?xml version="1.0" encoding="utf-8"?>${parser.toXml(relsJson)}`);

    if (!fs.existsSync(`modified/${unzippedName}/word/webextensions/_rels`)) {
      fs.mkdirSync(`modified/${unzippedName}/word/webextensions/_rels`, { recursive: true });
    }
    fs.writeFileSync(
      `modified/${unzippedName}/word/webextensions/_rels/taskpanes.xml.rels`,
      // eslint-disable-next-line max-len
      `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.microsoft.com/office/2011/relationships/webextension" Target="/word/webextensions/webextension.xml" Id="${taskpaneId}" /></Relationships>`
    );

    fs.writeFileSync(
      `modified/${unzippedName}/word/webextensions/taskpanes.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <wetp:taskpanes xmlns:wetp="http://schemas.microsoft.com/office/webextensions/taskpanes/2010/11">
        <wetp:taskpane dockstate="right" visibility="0" width="350" row="1">
          <wetp:webextensionref r:id="${taskpaneId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" />
        </wetp:taskpane>
      </wetp:taskpanes>`
    );
    fs.writeFileSync(
      `modified/${unzippedName}/word/webextensions/webextension.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <we:webextension id="${uuidv1()}" xmlns:we="http://schemas.microsoft.com/office/webextensions/webextension/2010/11">
        <we:reference id="894cdd7a-d434-449d-9245-362748277282" version="1.0.0.0" store="developer" storeType="uploadfiledevcatalog" />
        <we:alternateReferences />
        <we:properties>
          <we:property name="Office.AutoShowTaskpaneWithDocument" value="true" />
        </we:properties>
        <we:bindings />
        <we:snapshot xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" />
      </we:webextension>`
    );

    /**
     * Zip
     */
    const fileName = `${req.files.file[0].originalname.substring(0, req.files.file[0].originalname.length - 5)}_SmartDoc.docx`;
    const buffer = await zipdir(`modified/${unzippedName}`);
    fs.writeFileSync(`modified/${fileName}`, buffer);

    fs.rmdirSync(`modified/${unzippedName}`, { recursive: true });
    fs.unlinkSync('modified/filled.docx');
    if (req.files.file) {
      fs.unlinkSync(req.files.file[0].path);
    }

    if (req.files.logo) {
      fs.unlinkSync(req.files.logo[0].path);
    }

    const encryptedData = await registerIdentity(fileName, guid, subscription_key);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash');
    res.setHeader('file-name', fileName);
    res.setHeader('id', guid);
    res.setHeader('hash', encryptedData);

    res.download(`modified/${fileName}`, fileName, () => {
      fs.unlinkSync(`modified/${fileName}`);
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.deleteDocassemble = async (req, res) => {
  try {
    await deleteAzureBlob('docassemble', req.body.name);
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.docassemble = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const { meta_form, file } = req.body;
    const meta = JSON.parse(meta_form);

    const srcFileName = 'modified/docassemble.pdf';
    await doRequest(file, srcFileName);

    // Create pdf writer
    const writer = hummus.createWriterToModify(srcFileName, {
      modifiedFilePath: 'modified/docassemble_modified.pdf',
    });
    const reader = hummus.createReader(srcFileName);
    // Add meta data
    const infoDictionary = writer.getDocumentContext().getInfoDictionary();
    for (const key of Object.keys(meta)) {
      infoDictionary.addAdditionalInfoEntry(key, meta[key]);
    }
    infoDictionary.addAdditionalInfoEntry('infoJSON', JSON.stringify(meta));
    const guid = uuidv1();
    infoDictionary.addAdditionalInfoEntry('id', guid);

    // Fill form fields
    meta.id = guid;
    fillForm(writer, meta);

    // Add QR Code into first page
    await QRCode.toFile('qr.png', `${process.env.API_URL}/QRVerify/${guid}`);
    const pageBox = reader.parsePage(0).getMediaBox();
    const pageWidth = pageBox[2] - pageBox[0];
    const pageHeight = pageBox[3] - pageBox[1];
    const pageModifier = new hummus.PDFPageModifier(writer, 0, true);
    const ctx = pageModifier.startContext().getContext();
    ctx.drawImage(pageWidth - 100, pageHeight - 100, 'qr.png', {
      transformation: {
        width: 100,
        height: 100,
        fit: 'always',
      },
    });

    ctx.drawImage(pageWidth - 65, pageHeight - 65, 'integra-qr.png', {
      transformation: {
        width: 30,
        height: 30,
        fit: 'always',
      },
    });
    pageModifier.endContext().writePage();
    pageModifier
      .attachURLLinktoCurrentPage(`${process.env.API_URL}/QRVerify/${guid}`, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100)
      .endContext()
      .writePage();
    writer.end();

    const originName = file.split('/').pop();

    // Generate file name (Attach 'SmartDoc' to original filename)
    const fileName = `${originName.substring(0, originName.length - 4)}_SmartDoc.pdf`;
    await renameFileAsync('modified/docassemble_modified.pdf', `modified/${fileName}`);

    const encryptedData = await registerIdentity(fileName, guid, subscription_key);

    // Attach file name to response header
    res.setHeader('Access-Control-Expose-Headers', 'file-name, id, hash');
    res.setHeader('file-name', fileName);
    res.setHeader('id', guid);
    res.setHeader('hash', encryptedData);

    const uploadedUrl = await uploadFileToAzure('docassemble', `modified/${fileName}`, fileName);
    res.status(200).json({
      success: true,
      url: uploadedUrl,
    });

    fs.unlinkSync(`modified/${fileName}`);
    fs.unlinkSync('modified/docassemble.pdf');
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.qrVerify = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const response = await fetch(`${BLOCKCHAIN_API_URL}/recordexists/${req.params.guid}`, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscription_key,
      },
    });
    const result = await response.json();
    if (result.statusCode === 401) {
      throw { statusCode: 401, message: result.message };
    }
    if (result.exists) {
      res.render('success', {
        identityId: result.data[result.data.length - 1].Record.identityId,
        value: result.data[result.data.length - 1].Record.value,
        metaData: result.data[result.data.length - 1].Record.metaData,
        creationDate: moment(result.data[result.data.length - 1].Record.creationDate).format('LLL'),
      });
    } else {
      res.render('failure');
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.publicKey = async (req, res) => {
  try {
    const subscription_key = isProd ? process.env.SUBSCRIPTION_KEY : req.headers['x-subscription-key'];
    const response = await fetch(`${BLOCKCHAIN_API_URL}/keyforowner/${req.params.id}`, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscription_key,
      },
    });
    const responseJson = await response.json();
    if (responseJson.statusCode === 401) {
      throw { statusCode: 401, message: responseJson.message };
    }
    if (responseJson.exists) {
      res.status(200).json({
        exists: true,
        publicKey: responseJson.data[responseJson.data.length - 1].Record.keyValue,
      });
    } else {
      res.status(200).json({
        exists: false,
      });
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.verifyKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { public_key, encrypted_passphrase } = req.body;
    const pubKey = createPublicKeyObject(public_key);

    const verify = crypto.createVerify('SHA256');
    verify.write(key);
    verify.end();
    const result = verify.verify(pubKey, Buffer.from(encrypted_passphrase, 'base64'));
    res.status(200).json({
      success: result,
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.encryptWithPublicKey = async (req, res) => {
  try {
    const { public_key } = req.body;
    const toEncrypt = fs.readFileSync(req.file.path, 'binary');
    const buffer = Buffer.from(toEncrypt);
    const key = createPublicKeyObject(public_key);
    const enc = encrypt(buffer);
    const AESEncryptedDoc = enc.encryptedData;
    const RSAEncryptedKey = crypto.publicEncrypt(key, enc.key);
    const RSAEncryptedIv = crypto.publicEncrypt(key, enc.iv);
    const encrypted = {
      AESEncryptedDoc,
      RSAEncryptedKey: RSAEncryptedKey.toString('base64'),
      RSAEncryptedIv: RSAEncryptedIv.toString('base64'),
    };

    res.send(encrypted);

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.decryptWithPrivateKey = async (req, res) => {
  try {
    const { data, private_key } = req.body;
    const { AESEncryptedDoc, RSAEncryptedIV, RSAEncryptedKey, filename } = data;
    const key = createPrivateKeyObject(private_key);

    const aes_iv = crypto.privateDecrypt(key, Buffer.from(RSAEncryptedIV, 'base64'));
    const aes_key = crypto.privateDecrypt(key, Buffer.from(RSAEncryptedKey, 'base64'));
    const dec = decrypt({
      encryptedData: AESEncryptedDoc,
      iv: aes_iv,
      key: aes_key,
    });
    fs.writeFileSync(`modified/${filename}`, dec, 'binary');

    res.setHeader('Access-Control-Expose-Headers', 'file-name');
    res.setHeader('file-name', filename);

    res.download(`modified/${filename}`, filename, () => {
      fs.unlinkSync(`modified/${filename}`);
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.email = async (req, res) => {
  try {
    const { email, name, filename, type } = req.body;
    const attachment = fs.readFileSync(req.file.path).toString('base64');
    let template = '';
    let subject = '';
    if (type === 'IntegraEncrypt') {
      subject = 'New Integra Encrypted Document';
      template =
        `Hi ${name},<br><br>` +
        // eslint-disable-next-line max-len
        `A document has been encrypted and sent to you using your public cartridge using Integra Blockchain Encryption.  The document has been encrypted using two forms of encryption, RSA and AES, and can only be decrypted using your Integra Private Cartridge document.<br>
    <br>
    Please visit https://hedgefund.z20.web.core.windows.net/, then select "Individual" and then "Decrypt a Document".<br>
    <br>` +
        // eslint-disable-next-line max-len
        `The attached file will dragged onto the left hand side of the screen and on the right hand side you will drag your Integra Private Cartridge and be asked to enter your Passphrase.  Once verified, the decrypted document will be available for download and viewing in your browser.<br>
    <br>
    Thank you from the entire Integra Team for trusting your document security with us!`;
    } else if (type === 'HedgeFund') {
      subject = 'New Subscription Agreement Document';
      template =
        `Hi ${name},<br><br>` +
        // eslint-disable-next-line max-len
        `A new subscription agreement document has been generated using the Integra Hedge Fund Application.  The attached document has been encrypted for security of the information contained within the document.<br>
    <br>` +
        // eslint-disable-next-line max-len
        `To decrypt the document, please go to https://hedgefund.z20.web.core.windows.net/, click "Individual", then click on "Decrypt a Document".  In order to decrypt this document make sure to have your private key attesation document available.<br>
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
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
    res.send({ success: true });
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.readFile = (req, res) => {
  let filecontent = '';
  fs.readFile(req.file.path, async (err, data) => {
    const filePath = req.file.path;
    const filebuffer = data;
    const filename = req.file.originalname;
    const fileextension = filereader.getFileExtension(filename);
    switch (fileextension) {
      case '.pdf':
        new PdfReader().parseBuffer(filebuffer, (parseErr, item) => {
          if (!parseErr && item && item.text) {
            filecontent = `${filecontent} ${item.text}`;
          }
        });
        break;
      case '.doc':
      case '.docx':
        filecontent = await filereader.extract(filePath);
        break;
      case '.xlsx':
      case '.xls': {
        const result = {};
        data = new Uint8Array(data);
        const workbook = XLSX.read(data, {
          type: 'array',
        });
        workbook.SheetNames.forEach(sheetName => {
          const roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
          });
          if (roa.length) result[sheetName] = roa;
        });
        filecontent = JSON.stringify(result);
        break;
      }
      case '.txt':
      case '.csv':
        filecontent = data;
        break;
      default:
        filecontent = filename;
    }
    res.send(filecontent);
  });
};

exports.verification = async (req, res) => {
  try {
    const resource = Stripe.StripeResource.extend({
      request: Stripe.StripeResource.method({
        method: 'POST',
        path: 'identity/verification_intents',
      }),
    });

    new resource(stripe).request(
      {
        return_url: `${process.env.WEB_URL}/id-verification?vi={VERIFICATION_INTENT_ID}`,
        requested_verifications: ['identity_document'],
      },
      (err, response) => {
        res.send({
          id: response.id,
          url: response.next_action.redirect_to_url,
        });
      }
    );
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.idVerification = async (req, res) => {
  try {
    const verification_intent_id = req.params.id;

    const resource = stripe.StripeResource.extend({
      request: stripe.StripeResource.method({
        method: 'POST',
        path: `identity/verification_intents/${verification_intent_id}`,
      }),
    });

    new resource(stripe).request({}, (err, response) => {
      res.send(response);
    });
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.checkFile = (req, res) => {
  try {
    res.render('checkfile');
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.uploadToAzure = async (req, res) => {
  try {
    const uploadedUrl = await uploadFileToAzure(req.body.container, req.file.path, req.file.originalname);
    res.status(200).json({
      success: true,
      url: uploadedUrl,
    });
    fs.unlinkSync(req.file.path);
  } catch (err) {
    res.status(err.statusCode || 500).send(err);
  }
};

exports.root = (req, res) => {
  res.send(`Integra API (Blockchain API: ${BLOCKCHAIN_API_URL})`);
};
