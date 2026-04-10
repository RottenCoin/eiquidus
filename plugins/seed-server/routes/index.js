'use strict';

/**
 * Seed Server Plugin - routes/index.js
 * Adds HTTP seed API endpoints to the eiquidus explorer.
 *
 * Endpoints:
 *   GET /api/seed/peers        - JSON list of active peers
 *   GET /api/seed/peers.txt    - Plain-text IP:port list (one per line)
 *   GET /api/seed/stats        - Seed server statistics
 *   GET /seed                  - Human-readable seed info page (plain text)
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

// ── Mongoose model (matches eiquidus Peers schema) ──────────────────────────
let Peers;
try {
  Peers = mongoose.model('Peers');
} catch (e) {
  const PeersSchema = new mongoose.Schema({
    createdAt:    { type: Date, expires: 86400, default: Date.now },
    address:      { type: String, default: '', index: true },
    port:         { type: String, default: '' },
    protocol:     { type: String, default: '' },
    version:      { type: String, default: '' },
    country:      { type: String, default: '' },
    country_code: { type: String, default: '' },
    ipv6:         { type: Boolean, default: false },
    table_type:   { type: String, enum: ['C','A','O'], default: 'C', index: true }
  });
  Peers = mongoose.model('Peers', PeersSchema);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns only peers from the Connections table (currently live)
function getActivePeers(cb) {
  Peers.find({ table_type: 'C' })
    .select('-_id address port protocol version country country_code ipv6')
    .sort({ ipv6: 1, address: 1 })
    .lean()
    .exec()
    .then(peers => cb(null, peers))
    .catch(err  => cb(err, []));
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/seed/peers
 * JSON array of active seed peers.
 * Example response:
 *   [{"address":"1.2.3.4","port":"5151","version":"70208",...}, ...]
 */
router.get('/api/seed/peers', function(req, res) {
  getActivePeers(function(err, peers) {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch peers', detail: err.message });
    }
    res.json(peers);
  });
});

/**
 * GET /api/seed/peers.txt
 * Plain-text peer list, one ip:port per line.
 * Useful for simple addnode scripts.
 */
router.get('/api/seed/peers.txt', function(req, res) {
  getActivePeers(function(err, peers) {
    if (err) {
      return res.status(500).send('# Error fetching peers\n');
    }
    const lines = peers
      .filter(p => p.address && p.port)
      .map(p => {
        // wrap IPv6 in brackets
        const addr = p.ipv6 ? `[${p.address}]` : p.address;
        return `${addr}:${p.port}`;
      });
    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n') + (lines.length ? '\n' : ''));
  });
});

/**
 * GET /api/seed/stats
 * Summary counts for monitoring.
 */
router.get('/api/seed/stats', function(req, res) {
  Promise.all([
    Peers.countDocuments({ table_type: 'C' }),
    Peers.countDocuments({ table_type: 'A' }),
    Peers.countDocuments({ table_type: 'O' }),
    Peers.countDocuments({})
  ]).then(([connections, addnodes, onetry, total]) => {
    res.json({
      connections,
      addnodes,
      onetry,
      total,
      timestamp: new Date().toISOString()
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

/**
 * GET /seed
 * Human-readable plain-text seed info page.
 * Lists active peers and basic stats.
 */
router.get('/seed', function(req, res) {
  getActivePeers(function(err, peers) {
    res.set('Content-Type', 'text/plain');

    if (err) {
      return res.send('# Seed Server\n# Error: ' + err.message + '\n');
    }

    const lines = [
      '# Blockchain Seed Server',
      '# Powered by eiquidus + seed-server plugin',
      '# ' + new Date().toUTCString(),
      '#',
      '# Active peers: ' + peers.length,
      '#',
      '# Format: ip:port  (country)  version',
      ''
    ];

    peers.forEach(p => {
      const addr    = p.ipv6 ? `[${p.address}]` : p.address;
      const country = p.country_code ? `(${p.country_code})` : '';
      const ver     = p.version ? `v${p.version}` : '';
      lines.push(`${addr}:${p.port}  ${country}  ${ver}`.trimEnd());
    });

    if (peers.length === 0) {
      lines.push('# No active peers found. Run: npm run sync-peers');
    }

    res.send(lines.join('\n') + '\n');
  });
});

module.exports = router;
