import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { scrape } from './websites/dealabs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8092;
const app = express();

let SALES = {};
let DEALS = [];

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

app.get('/', (request, response) => {
  response.send({ ack: true });
});

// ✅ /deals/search AVANT /deals/:id sinon Express croit que "search" est un id
app.get('/deals/search', (request, response) => {
  try {
    const { limit = 12, price, date, filterBy } = request.query;

    let results = [...DEALS];

    if (price) {
      results = results.filter(d => d.price <= parseFloat(price));
    }

    if (date) {
      const timestamp = new Date(date).getTime() / 1000;
      results = results.filter(d => d.published >= timestamp);
    }

    if (filterBy === 'best-discount') {
      results = results.filter(d => d.discount >= 50);
    } else if (filterBy === 'most-commented') {
      results = results.filter(d => d.comments >= 5);
    }

    results = results.sort((a, b) => a.price - b.price);

    const total = results.length;
    results = results.slice(0, parseInt(limit));

    return response.status(200).json({
      success: true,
      data: { limit: parseInt(limit), total, results }
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ success: false, data: null });
  }
});

// ✅ /deals/:id APRÈS /deals/search
app.get('/deals/:id', (request, response) => {
  const { id } = request.params;
  const deal = DEALS.find(d => d.uuid === id);

  if (!deal) {
    return response.status(404).json({ success: false, data: null });
  }

  return response.status(200).json({ success: true, data: deal });
});

// ✅ /sales/search
app.get('/sales/search', (request, response) => {
  try {
    const { limit = 12, legoSetId } = request.query;

    let results = legoSetId ? (SALES[legoSetId] || []) : [];

    results = results.sort((a, b) => b.published - a.published);

    const total = results.length;
    results = results.slice(0, parseInt(limit));

    return response.status(200).json({
      success: true,
      data: { limit: parseInt(limit), total, results }
    });
  } catch (error) {
    console.error(error);
    return response.status(404).json({ success: false, data: { results: [] } });
  }
});

app.listen(PORT, async () => {
  // Chargement Vinted depuis le fichier JSON
  try {
    SALES = JSON.parse(
      readFileSync(path.join(__dirname, 'sources', 'vinted.json'), 'utf8')
    );
    console.log('✅ vinted.json chargé');
  } catch (error) {
    console.warn(`⚠️  vinted.json introuvable : ${error.message}`);
  }

  // Chargement Dealabs via le scraper
  try {
    console.log('🕵️ Scraping Dealabs...');
    DEALS = await scrape();
    console.log(`✅ ${DEALS.length} deals Dealabs chargés`);
  } catch (error) {
    console.warn(`⚠️  Scraping Dealabs échoué : ${error.message}`);
  }
});

console.log(`📡 Running on port ${PORT}`);