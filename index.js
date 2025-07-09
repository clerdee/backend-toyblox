const app = require('./app');
const PORT = 4000;

app.listen(PORT, () => {
    console.log(`${PORT}\nServer is running on port ${PORT}`);
});
