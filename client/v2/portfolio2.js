'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────

let currentDeals = [];
let currentPagination = {};
let currentFilter = null;
let currentSort = null;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// ─── SELECTORS ───────────────────────────────────────────────────────────────

const selectShow        = document.querySelector('#show-select');
const selectPage        = document.querySelector('#page-select');
const selectSort        = document.querySelector('#sort-select');
const sectionDeals      = document.querySelector('#deals');
const spanNbDeals       = document.querySelector('#nbDeals');
const spanNbSales       = document.querySelector('#nbSales');
const spanP5            = document.querySelector('#p5Price');
const spanP25           = document.querySelector('#p25Price');
const spanP50           = document.querySelector('#p50Price');
const spanLifetime      = document.querySelector('#lifetime');
const spanAvgPrice      = document.querySelector('#avgPrice');
const sectionVinted     = document.querySelector('#vinted-sales');
const filterBtns        = document.querySelectorAll('.filter-btn');

// ─── API ─────────────────────────────────────────────────────────────────────

const setCurrentDeals = ({ result, meta }) => {
  currentDeals = result;
  currentPagination = meta;
};

const fetchDeals = async (page = 1, size = 6) => {
  try {
    console.log(`Fetching deals: page=${page}, size=${size}`);
    const response = await fetch(`https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`);
    const body = await response.json();
    console.log('API Response:', body);
    
    if (body.success !== true) {
      console.error('API returned success=false:', body);
      return { result: [], meta: { currentPage: 1, pageCount: 1, count: 0 } };
    }
    return body.data;
  } catch (error) {
    console.error('Fetch error:', error);
    return { result: [], meta: { currentPage: 1, pageCount: 1, count: 0 } };
  }
};

const fetchSales = async id => {
  try {
    console.log(`Fetching sales for id: ${id}`);
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${id}`);
    const body = await response.json();
    console.log('Sales API Response:', body);
    
    if (body.success !== true) {
      console.error('Sales API returned success=false:', body);
      return [];
    }
    return body.data.result || [];
  } catch (error) {
    console.error('Fetch sales error:', error);
    return [];
  }
};

// ─── FILTER + SORT ───────────────────────────────────────────────────────────

const applyFilterAndSort = deals => {
  let result = [...deals];

  if (currentFilter === 'discount')  result = result.filter(d => d.discount > 50);
  if (currentFilter === 'commented') result = result.filter(d => d.comments > 15);
  if (currentFilter === 'hot')       result = result.filter(d => d.temperature > 100);
  if (currentFilter === 'favorite')  result = result.filter(d => favorites.includes(d.uuid));

  if (currentSort === 'price-asc')  result.sort((a, b) => a.price - b.price);
  if (currentSort === 'price-desc') result.sort((a, b) => b.price - a.price);
  if (currentSort === 'date-asc')   result.sort((a, b) => toTimestamp(a.published) - toTimestamp(b.published));
  if (currentSort === 'date-desc')  result.sort((a, b) => toTimestamp(b.published) - toTimestamp(a.published));

  return result;
};

// ─── RENDER DEALS ────────────────────────────────────────────────────────────

const renderDeals = deals => {
  console.log('Rendering deals:', deals);
  const visible = applyFilterAndSort(deals);

  if (!visible.length) {
    sectionDeals.innerHTML = '<h2 class="deals-header">Deals</h2><p class="empty">No deals available.</p>';
    return;
  }

  const cards = visible.map(deal => {
    const isFav = favorites.includes(deal.uuid);
    const discount = deal.discount !== null ? `<span class="badge discount">-${deal.discount}%</span>` : '';
    const temp = deal.temperature != null ? `<span class="badge temp">🌡 ${Math.round(deal.temperature)}°</span>` : '';
    const comments = deal.comments != null ? `<span class="badge comments">💬 ${deal.comments}</span>` : '';
    const photo = deal.photo && !deal.photo.includes('image-non-chargee')
      ? `<img src="${deal.photo}" alt="${deal.title}" loading="lazy">`
      : `<div class="no-photo">🧱</div>`;

    return `
      <article class="deal-card" id="${deal.uuid}">
        <div class="deal-photo">${photo}</div>
        <div class="deal-body">
          <div class="deal-badges">${discount}${temp}${comments}</div>
          <h3 class="deal-title">
            <a href="${deal.link}" target="_blank" rel="noopener">${deal.title}</a>
          </h3>
          <div class="deal-meta">
            <span class="deal-price">€${deal.price}</span>
            ${deal.retail ? `<span class="deal-retail">€${deal.retail}</span>` : ''}
            <span class="deal-date">${formatDate(deal.published)}</span>
            ${deal.community ? `<span class="deal-community">${deal.community}</span>` : ''}
          </div>
        </div>
        <button class="fav-btn ${isFav ? 'active' : ''}" data-uuid="${deal.uuid}" title="${isFav ? 'Remove favorite' : 'Save as favorite'}">
          ${isFav ? '★' : '☆'}
        </button>
      </article>
    `;
  }).join('');

  sectionDeals.innerHTML = `<h2 class="deals-header">Deals</h2><div class="deals-grid">${cards}</div>`;

  sectionDeals.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.uuid));
  });
};

// ─── RENDER PAGINATION ───────────────────────────────────────────────────────

const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from({ length: pageCount }, (_, i) =>
    `<option value="${i + 1}">${i + 1}</option>`
  ).join('');
  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

// ─── RENDER INDICATORS ───────────────────────────────────────────────────────

const renderIndicators = pagination => {
  spanNbDeals.textContent = pagination.count || 0;
};

// ─── RENDER VINTED SALES ─────────────────────────────────────────────────────

const renderSales = sales => {
  spanNbSales.textContent = sales.length;

  if (!sales.length) {
    sectionVinted.innerHTML = '<p class="empty">No Vinted sales found.</p>';
    spanP5.textContent = '—'; 
    spanP25.textContent = '—';
    spanP50.textContent = '—'; 
    spanLifetime.textContent = '—';
    spanAvgPrice.textContent = '—';
    return;
  }

  // Extraire les valeurs numériques uniquement pour stats
  const numericPrices = sales
    .map(s => {
      if (!s.price) return null;
      if (typeof s.price === 'object' && s.price.amount != null) return parseFloat(s.price.amount);
      const num = String(s.price).replace(',', '.').replace(/[^\d.]/g, '');
      const val = parseFloat(num);
      return isNaN(val) ? null : val;
    })
    .filter(p => p !== null)
    .sort((a,b)=>a-b);

  // Statistiques
  const avg = numericPrices.length ? numericPrices.reduce((sum,p)=>sum+p,0)/numericPrices.length : 0;
  spanAvgPrice.textContent = numericPrices.length ? `€${avg.toFixed(2)}` : '—';
  spanP5.textContent  = numericPrices.length ? `€${percentile(numericPrices,5).toFixed(2)}` : '—';
  spanP25.textContent = numericPrices.length ? `€${percentile(numericPrices,25).toFixed(2)}` : '—';
  spanP50.textContent = numericPrices.length ? `€${percentile(numericPrices,50).toFixed(2)}` : '—';
  spanLifetime.textContent = `${lifetimeDays(sales)} days`;

  // Affichage des ventes : toujours afficher toutes, prix transformé si possible
  const rows = sales.map(s => {
    let displayPrice = '—';
    if (s.price != null) {
      if (typeof s.price === 'object' && s.price.amount != null) displayPrice = `€${parseFloat(s.price.amount).toFixed(2)}`;
      else displayPrice = String(s.price);
    }
    return `
      <article class="sale-card">
        <div class="sale-body">
          <p class="sale-title">
            <a href="${s.link}" target="_blank" rel="noopener">${s.title}</a>
          </p>
          <div class="sale-meta">
            <span class="sale-price">${displayPrice}</span>
            <span class="sale-date">${formatDate(s.published)}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  sectionVinted.innerHTML = `<div class="sales-grid">${rows}</div>`;
};

// ─── FAVORITES ───────────────────────────────────────────────────────────────

const toggleFavorite = uuid => {
  favorites = favorites.includes(uuid)
    ? favorites.filter(id => id !== uuid)
    : [...favorites, uuid];
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderDeals(currentDeals);
};

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────

const render = (deals, pagination) => {
  console.log('Main render called');
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  
  // Load vinted for first deal's set ID
  if (deals.length > 0 && deals[0].id) {
    fetchSales(deals[0].id).then(renderSales);
  }
};

// ─── LISTENERS ───────────────────────────────────────────────────────────────

// Feature 0: show more
selectShow.addEventListener('change', async event => {
  const data = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});

// Feature 1: browse pages
selectPage.addEventListener('change', async event => {
  const data = await fetchDeals(parseInt(event.target.value), parseInt(selectShow.value));
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});

// Features 2, 3, 4, 14: filters
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    if (currentFilter === filter) {
      currentFilter = null;
      filterBtns.forEach(b => b.classList.remove('active'));
    } else {
      currentFilter = filter;
      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    }
    renderDeals(currentDeals);
  });
});

// Features 5 + 6: sort
if (selectSort) {
  selectSort.addEventListener('change', event => {
    currentSort = event.target.value;
    renderDeals(currentDeals);
  });
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, fetching initial deals...');
  const data = await fetchDeals();
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});