const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

const items = require('./routes/item')
// const users = require('./routes/user')

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/images', express.static(path.join(__dirname, 'images')))

app.use('/api/v1', items);
// app.use('/api/v1', users);

// Server
// app.listen(4000, '172.34.12.67', () => {
//   console.log("Backend running at http://172.34.12.67:4000");
// });


module.exports = app