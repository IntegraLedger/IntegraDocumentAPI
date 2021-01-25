const StreamZip = require('node-stream-zip');
const PdfReader = require('pdfreader').PdfReader;

function open(filePath) {
  return new Promise((resolve, reject) => {
    const zip = new StreamZip({
      file: filePath,
      storeEntries: true,
    });
    zip.on('ready', () => {
      const chunks = [];
      let content = '';
      zip.stream('word/document.xml', (err, stream) => {
        if (err) {
          reject(err);
        }
        stream.on('data', chunk => {
          chunks.push(chunk);
        });
        stream.on('end', () => {
          content = Buffer.concat(chunks);
          zip.close();
          resolve(content.toString());
        });
      });
    });
  });
}

exports.extract = function (filePath) {
  return new Promise((resolve, reject) => {
    open(filePath).then((res, err) => {
      if (err) {
        reject(err);
      }
      let body = '';
      const components = res.toString().split('<w:t');
      for (let i = 0; i < components.length; i++) {
        const tags = components[i].split('>');
        const content = tags[1].replace(/<.*$/, '');
        body += `${content} `;
      }
      resolve(body);
    });
  });
};

exports.getFileExtension = function (filename) {
  if (filename.length === 0) return '';
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  const extension = filename.substr(dot, filename.length);
  return extension;
};
exports.readPDFFile = function (pdfFilePath, pdfBuffer) {
  return new Promise((resolve, reject) => {
    let content = '';
    new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        reject(err);
      } else if (item.text) {
        content = item.text;
        resolve(content.toString());
      }
    });
  });
};
