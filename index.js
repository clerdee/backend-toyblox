// const app = require('./app');

// require('dotenv').config()

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//     console.log(PORT)
//   console.log(`Server is running on port ${PORT}`);
// });

// const express = require('express');
// const cors = require('cors');
// const app = express();
// const PORT = 4000;

// Allow frontend to talk to backend
// app.use(cors());
// app.use(express.json());

// Sample route
// app.get('/api/items', (req, res) => {
//     res.json([
//         { id: 1, name: 'Apple' },
//         { id: 2, name: 'Banana' }
//     ]);
// });

// app.listen(PORT, () => {
//     console.log(`${PORT}\nServer is running on port ${PORT}`);
// });

const app = require('./app');
const PORT = 4000;

app.listen(PORT, () => {
    console.log(`${PORT}\nServer is running on port ${PORT}`);
});
