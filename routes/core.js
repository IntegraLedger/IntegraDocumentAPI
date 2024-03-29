const express = require('express');
const multer = require('multer');
const fs = require('fs');
const uuidv1 = require('uuid/v1');
const core = require('../controllers/core');

const router = express.Router();

const UPLOAD_BASE_DIR = 'uploads';
const UPLOAD_LIMITS = { fieldSize: 25 * 1024 * 1024 };

const upload = multer({
  dest: UPLOAD_BASE_DIR,
  limits: UPLOAD_LIMITS,
});

// multer storage and instance for /docxSmartDoc
const smartDocxStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname !== 'logo') {
      req.guid = uuidv1();
      const workDir = `${UPLOAD_BASE_DIR}/${req.guid}`;
      req.workDir = workDir;

      fs.mkdirSync(workDir);

      cb(null, req.workDir);
    } else {
      cb(null, UPLOAD_BASE_DIR);
    }
  },
});

const smartDocUpload = multer({
  storage: smartDocxStorage,
  limits: UPLOAD_LIMITS,
});

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
 *              required:
 *                - file
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
router.post('/analyze', upload.single('file'), core.analyze);

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
 *              required:
 *                - file
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
router.post('/analyzeDocx', upload.single('file'), core.analyzeDocx);
router.post('/analyzeDocxNohash', upload.single('file'), core.analyzeDocxNohash);

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
 *              required:
 *                - meta_form
 *                - file
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                cartridge_type:
 *                  type: string
 *                  description: Required for cartridge smart document. Available cartridge types are `Organization`, `Personal`, `Encrypt`, `Purchaser`, `Vendor`, `VendorContract`, `PurchaseOrder`, `Invoice`.
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document. Should be JSON parsable string.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                file:
 *                  type: file
 *                  description: PDF file to put metadata. not necessary for the cartridge creation.
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      parameters:
 *        - in: query
 *          name: type
 *          schema:
 *            type: string
 *          description: used for hedgefund to create private and public personal cartridge documents.
 *        - in: header
 *          name: integra-id
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt1
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt2
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt3
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          description: return signed pdf file
 */
router.post('/pdf', upload.single('file'), core.pdf);

/**
 * @swagger
 * path:
 *  /doc/:
 *    post:
 *      description: Create signed pdf format smart document with adding metadata, filling form fields and adding QR code
 *      tags: [Smart Doc]
 *      parameters:
 *        - in: header
 *          name: integra-id
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt1
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt2
 *          schema:
 *            type: string
 *        - in: header
 *          name: opt3
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              required:
 *                - meta_form
 *                - file
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document. Should be JSON parsable string.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                file:
 *                  type: file
 *                  description: Docx file to put metadata.
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      responses:
 *        "200":
 *          description: return signed docx file
 */
router.post('/doc', upload.single('file'), core.doc);

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
 *              required:
 *                - meta_form
 *                - file
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document. Should be JSON parsable string.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                logo:
 *                  type: file
 *                  description: Either file object or url of the logo image for qr code section. (Both file and string are supported)
 *                file:
 *                  type: file
 *                  description: Docx file to put metadata.
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      responses:
 *        "200":
 *          description: return signed docx file
 */
router.post(
  '/docxSmartDoc',
  smartDocUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  core.docxSmartdoc
);

/**
 * @swagger
 * path:
 *  /xlsSmartDoc/:
 *    post:
 *      description: Create signed xlsx format smart document with adding metadata, filling form fields of docx file and adding QR code
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              required:
 *                - meta_form
 *                - file
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document. Should be JSON parsable string.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                file:
 *                  type: file
 *                  description: Xlsx file to put metadata.
 *      responses:
 *        "200":
 *          description: return signed xlsx file
 */
router.post(
  '/xlsSmartDoc',
  smartDocUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  core.xlsSmartdoc
);

/**
 * @swagger
 * path:
 *  /docxSmartDocAutoOpen/:
 *    post:
 *      description: Create signed docx format smart document which opens addin panel automatically with adding metadata, filling form fields of docx file and adding QR code
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              required:
 *                - meta_form
 *                - file
 *              properties:
 *                master_id:
 *                  type: string
 *                  description: master ID of the smart document
 *                meta_form:
 *                  type: string
 *                  required: true
 *                  description: metadata for the smart document. Should be JSON parsable string.
 *                data_form:
 *                  type: string
 *                  required: true
 *                  description: array of components such as textfield, textarea, checkbox, radio and so on. stored a stringified json object array as a `formJSON` meta field.
 *                logo:
 *                  type: file
 *                  description: Either file object or url of the logo image for qr code section. (Both file and string are supported)
 *                file:
 *                  type: file
 *                  description: Docx file to put metadata.
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      responses:
 *        "200":
 *          description: return signed docx file
 */
router.post(
  '/docxSmartDocAutoOpen',
  smartDocUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  core.docxSmartDocAutoOpen
);

router.delete('/docassemble', core.deleteDocassemble);
router.post('/docassemble', core.docassemble);

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
router.get('/QRVerify/:guid', core.qrVerify);

/**
 * @swagger
 * path:
 *  /recordExist/{guid}:
 *    get:
 *      description: Check if document(pdf & docx) is already registered by /registerIdentity
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
 *          description: return document registration record.
 */
router.get('/recordExist/:guid', core.recordExist);

/**
 * @swagger
 * path:
 *  /identityExist/{guid}:
 *    get:
 *      description: Check if document(pdf & docx) is already registered by /registerIdentity
 *      tags: [Smart Doc]
 *      parameters:
 *        - in: path
 *          name: guid
 *          schema:
 *            type: string
 *          required: true
 *          description: IntegraId of the file to check
 *      responses:
 *        "200":
 *          description: return document registration data.
 */
router.get('/identityExist/:guid', core.identityExist);

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
router.get('/publicKey/:id', core.publicKey);

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
router.post('/verifyKey/:key', core.verifyKey);

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
 *                public_key:
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
router.post('/encryptWithPublicKey', upload.single('file'), core.encryptWithPublicKey);

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
 *                private_key:
 *                  type: string
 *                  description: private key.
 *      responses:
 *        "200":
 *          description: return decrypted file
 */
router.post('/decryptWithPrivateKey', core.decryptWithPrivateKey);

/**
 * @swagger
 * path:
 *  /attestation/:
 *    post:
 *      description: Embed attestation pdf
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              required:
 *                - attachment
 *                - file
 *              properties:
 *                attachment:
 *                  type: file
 *                  description: Attestation pdf file.
 *                file:
 *                  type: file
 *                  description: Source pdf file.
 *      responses:
 *        "200":
 *          description: return embedded file
 */
router.post(
  '/attestation',
  smartDocUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'attachment', maxCount: 8 },
  ]),
  core.attestation
);

/**
 * @swagger
 * path:
 *  /verifyAttestation/:
 *    post:
 *      description: Return metadata for the source file and attached attestation pdf file.
 *      tags: [Smart Doc]
 *      requestBody:
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              required:
 *                - file
 *              properties:
 *                file:
 *                  type: file
 *                  description: PDF file with attestation attachment.
 *      responses:
 *        "200":
 *          description: return metadata for source file and attestation
 */
router.post('/verifyAttestation', smartDocUpload.fields([{ name: 'file', maxCount: 1 }]), core.verifyAttestation);

router.post('/email', upload.single('file'), core.email);
router.post('/readFile', upload.single('file'), core.readFile);
router.get('/verification', core.verification);
router.get('/verification/:id', core.idVerification);
router.get('/checkFile', core.checkFile);
router.get('/', core.root);
router.post('/upload', upload.single('file'), core.uploadToAzure);
router.post('/form-field', upload.single('file'), core.getFormField);
router.post('/convertToPdf', upload.single('file'), core.convertToPdf);
router.post('/verifyPrivateKey', core.verifyPrivateKey);

module.exports = router;
