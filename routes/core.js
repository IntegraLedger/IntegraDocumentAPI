const express = require('express');
const multer = require('multer');
const core = require('../controllers/core');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 25 * 1024 * 1024 },
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
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
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
router.post('/pdf', upload.single('file'), core.pdf);

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
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      responses:
 *        "200":
 *          description: return signed docx file
 */
router.post(
  '/docxSmartDoc',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  core.docxSmartdoc
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
 *                hide_qr:
 *                  type: boolean
 *                  description: hide qr code if this field is set true (optional)
 *      responses:
 *        "200":
 *          description: return signed docx file
 */
router.post(
  '/docxSmartDocAutoOpen',
  upload.fields([
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
 *                privateKey:
 *                  type: string
 *                  description: private key.
 *      responses:
 *        "200":
 *          description: return decrypted file
 */
router.post('/decryptWithPrivateKey', core.decryptWithPrivateKey);

router.post('/email', upload.single('file'), core.email);
router.post('/readFile', upload.single('file'), core.readFile);
router.get('/verification', core.verification);
router.get('/verification/:id', core.idVerification);
router.get('/checkFile', core.checkFile);
router.get('/', core.root);
router.post('/upload', upload.single('file'), core.uploadToAzure);

module.exports = router;
