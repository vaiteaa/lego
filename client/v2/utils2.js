'use strict';

/**
 * Extract unique non-empty lego set ids from a list of deals
 * @param {Array} deals
 * @returns {Array}
 */
const getIdsFromDeals = deals =>
  [...new Set(deals.map(d => d.id).filter(id => id))];

/**
 * Convert any published value to a Unix timestamp in seconds
 * @param {number|string} published
 * @returns {number}
 */
const toTimestamp = published =>
  typeof published === 'number' ? published : new Date(published).getTime() / 1000;

/**
 * Return the value at percentile p (0–100) of a sorted numeric array
 * @param {number[]} sorted - ascending sorted array
 * @param {number} p
 * @returns {number}
 */
const percentile = (sorted, p) => sorted[Math.floor(sorted.length * p / 100)];

/**
 * Format a timestamp or date string to a readable locale date
 * @param {number|string} published
 * @returns {string}
 */
const formatDate = published => {
  const ms = typeof published === 'number' ? published * 1000 : new Date(published).getTime();
  return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Compute the number of days between the oldest and newest item
 * @param {Array} items
 * @returns {number}
 */
const lifetimeDays = items => {
  if (items.length < 2) return 0;
  const timestamps = items.map(i => toTimestamp(i.published)).sort((a, b) => a - b);
  return Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 86400);
};