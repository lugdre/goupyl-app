const multer = require('multer');

// Stockage en mémoire : l'image est persistée en base (bytea), jamais sur le
// disque — le filesystem de Render (free tier) est éphémère.
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Type de fichier non autorisé. JPG, PNG ou WebP uniquement.'), false);
};

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
