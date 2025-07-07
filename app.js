const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const open = require('open');
const port = 4000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  open(`http://localhost:${port}/home.html`);
});

const items = require('./routes/item')
// const users = require('./routes/user')

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend-toyblox')));
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use('/api/v1', items);
// app.use('/api/v1', users);

module.exports = app