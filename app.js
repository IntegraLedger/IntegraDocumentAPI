require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Connect to mongodb
const uri = 'mongodb+srv://dbIntegra:password22@cluster0-qqiiz.azure.mongodb.net/integra?retryWrites=true&w=majority';
mongoose.connect(uri, {
  dbName: 'dbIntegra',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('DB connected.');
  })
  .catch(err => {
    console.log('Error: Unable to connect to db. ' + err);
  })

app.use('/', require('./routes/index'));

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
  apis: ["./app.js", "./routes/*.js"],
};

const specs = swaggerJsdoc(options);
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log('Listening on port ' + port + '!')
});

module.exports = { app, server };
