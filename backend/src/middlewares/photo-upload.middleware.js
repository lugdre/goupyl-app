const multer = require('multer');

// Photos de galerie coach — mémoire puis base (bytea), jamais le disque.
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Type de fichier non autorisé. JPG, PNG ou WebP uniquement.'), false);
};

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
