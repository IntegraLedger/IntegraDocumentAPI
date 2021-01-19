const app = require('./app')
const mongoose = require('mongoose');

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

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Listening on port ' + port + '!')
});
