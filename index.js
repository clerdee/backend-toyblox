const app = require('./app');

require('dotenv').config()

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(PORT)
  console.log(`Server is running on port ${PORT}`);
});

// const PORT = 3000;
// const HOST = '0.0.0.0';