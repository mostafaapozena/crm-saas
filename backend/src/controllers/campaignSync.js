'use strict';

const { syncPlatformCampaigns, syncSingleCampaign } = require('../lib/sync');
const prisma = require('../lib/prisma');

const syncMeta = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const results = await syncPlatformCampaigns('META', io);
    res.json({ platform: 'META', synced: results.filter(r => r.synced).length, results });
  } catch (err) { next(err); }
};

const syncGoogle = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const results = await syncPlatformCampaigns('GOOGLE', io);
    res.json({ platform: 'GOOGLE', synced: results.filter(r => r.synced).length, results });
  } catch (err) { next(err); }
};

// Sync a specific campaign by ID
const syncCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({ where: { id: parseInt(id) } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const io = req.app.get('io');
    const result = await syncSingleCampaign(campaign, io);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { syncMeta, syncGoogle, syncCampaign };
