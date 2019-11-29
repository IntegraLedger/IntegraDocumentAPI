const express = require('express')
const cors = require('cors')
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const hummus = require('hummus'),
  fillForm = require('./pdf-form-fill').fillForm
const app = express()
app.use(cors())

app.post('/', upload.single('pdf'), (req, res) => {
  const data = JSON.parse(req.body.meta)
  const writer = hummus.createWriterToModify(req.file.path, {
    modifiedFilePath: 'modified/' + req.file.filename
  })

  // Add meta data
  const infoDictionary = writer.getDocumentContext().getInfoDictionary()
  for (const key of Object.keys(data)) {
    infoDictionary.addAdditionalInfoEntry(key, data[key])
  }
  
  // Fill form fields
  fillForm(writer, data)
  writer.end()
  res.send({ msg: 'Hello World!' })
})

app.listen(3000, () => {
  console.log('Listening on port 3000!')
})