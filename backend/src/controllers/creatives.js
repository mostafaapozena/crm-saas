'use strict';

const path = require('path');
const multer = require('multer');
const prisma = require('../lib/prisma');

// Disk storage: /uploads/creatives/<timestamp>-<original>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/creatives'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images and videos are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// Middleware export for routes
const uploadMiddleware = upload.single('file');

const getCreatives = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatives = await prisma.creative.findMany({
      where: { campaign_id: parseInt(id) },
      orderBy: { created_at: 'desc' },
    });
    res.json(creatives);
  } catch (err) { next(err); }
};

const uploadCreative = async (req, res, next) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const { id } = req.params;
      const { ad_copy, type: bodyType } = req.body;

      if (!req.file && !req.body.file_url) {
        return res.status(400).json({ error: 'file or file_url is required' });
      }

      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const file_url = req.file
        ? `${backendUrl}/uploads/creatives/${req.file.filename}`
        : req.body.file_url;

      // Detect type from mime if file uploaded
      let type = 'IMAGE';
      if (req.file) {
        type = req.file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      } else if (bodyType === 'VIDEO') {
        type = 'VIDEO';
      }

      const creative = await prisma.creative.create({
        data: {
          campaign_id: parseInt(id),
          file_url,
          type,
          ad_copy: ad_copy || null,
        },
      });

      res.status(201).json(creative);
    } catch (err) { next(err); }
  });
};

const deleteCreative = async (req, res, next) => {
  try {
    const { creativeId } = req.params;
    await prisma.creative.delete({ where: { id: parseInt(creativeId) } });
    res.json({ message: 'Creative deleted' });
  } catch (err) { next(err); }
};

module.exports = { getCreatives, uploadCreative, deleteCreative };
