require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\nGoupyl Sport API`);
  console.log(`Serveur demarre sur le port ${PORT}`);
  console.log(`http://localhost:${PORT}/api/health`);
  console.log(`Environnement : ${process.env.NODE_ENV || 'development'}\n`);
});
