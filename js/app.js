const CONFIG = {
    PAGE_SIZE: 20,
    FETCH_TIMEOUT: 10000,
    IMAGE_FALLBACK: '../images/placeholder.png'
};

const RARITY_MAP = {
    common: 'common',
    uncommon: 'uncommon',
    rare: 'rare',
    legendary: 'legendary',
    mythic: 'mythic',
    ancient: 'ancient'
};

let currentCategory = '';
let allData = [];
let filteredData = [];
let currentPage = 1;
let isLoading = false;
let observer = null;
let searchTimeout = null;
let savedState = null;

function getCategory() {
    const path = window.location.pathname;
    if (path.includes('guns')) return 'guns';
    if (path.includes('knives')) return 'knives';
    if (path.includes('effects')) return 'effects';
    return 'guns';
}

function getCategoryTitle(cat) {
    if (cat === 'guns') return 'GUNS';
    if (cat === 'knives') return 'KNIVES';
    if (cat === 'effects') return 'EFFECTS';
    return 'CATÁLOGO';
}

function normalizeRarity(rarity) {
    const lower = (rarity || '').toLowerCase();
    return RARITY_MAP[lower] || 'common';
}

function validateItem(item) {
    if (!item || typeof item !== 'object' || !item.id || !item.name || !item.image) {
        return false;
    }
    item.rarity = normalizeRarity(item.rarity);
    return true;
}

async function fetchData(url) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        throw new Error('Fetch failed');
    }
}

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-rarity', item.rarity);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${item.name} - ${item.rarity}`);

    const img = document.createElement('img');
    img.src = `../images/${currentCategory}/${item.image}`;
    img.alt = item.name;
    img.loading = 'lazy';
    img.width = 400;
    img.height = 250;
    img.onerror = () => {
        img.src = CONFIG.IMAGE_FALLBACK;
    };

    const info = document.createElement('div');
    info.className = 'info';

    const nameEl = document.createElement('h3');
    nameEl.textContent = item.name;

    const badge = document.createElement('span');
    badge.className = 'rarity-badge';
    badge.textContent = item.rarity.toUpperCase();

    info.appendChild(nameEl);
    info.appendChild(badge);
    card.appendChild(img);
    card.appendChild(info);

    card.addEventListener('click', () => showModal(item));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showModal(item);
        }
    });

    return card;
}

function clearGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
}

function renderPage(page) {
    const grid = document.getElementById('grid');
    const start = (page - 1) * CONFIG.PAGE_SIZE;
    const end = Math.min(start + CONFIG.PAGE_SIZE, filteredData.length);
    const slice = filteredData.slice(start, end);

    slice.forEach(item => {
        grid.appendChild(createCard(item));
    });
}

function updateLoadMore() {
    const container = document.getElementById('load-more-container');
    const btn = document.getElementById('load-more-button');
    const hasMoreItems = filteredData.length > currentPage * CONFIG.PAGE_SIZE;

    if (hasMoreItems) {
        container.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'CARGAR MÁS';
    } else if (filteredData.length > 0) {
        container.classList.remove('hidden');
        btn.disabled = true;
        btn.textContent = 'ESAS SON TODAS';
    } else {
        container.classList.add('hidden');
    }
}

function filterAndRender() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    filteredData = allData.filter(item =>
        item.name.toLowerCase().includes(query)
    );

    currentPage = 1;
    clearGrid();

    if (filteredData.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('grid').classList.add('hidden');
        updateLoadMore();
        updateStatus(0);
        return;
    }

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('grid').classList.remove('hidden');

    renderPage(1);
    updateLoadMore();
    updateStatus(filteredData.length);
}

function updateStatus(count) {
    const status = document.getElementById('search-status');
    if (count === 0) {
        status.textContent = '';
        return;
    }
    status.textContent = `${count} resultado${count !== 1 ? 's' : ''}`;
}

function loadMore() {
    if (isLoading || filteredData.length <= currentPage * CONFIG.PAGE_SIZE) return;
    isLoading = true;
    const btn = document.getElementById('load-more-button');
    btn.disabled = true;
    btn.textContent = 'CARGANDO...';

    setTimeout(() => {
        currentPage++;
        renderPage(currentPage);
        isLoading = false;
        updateLoadMore();
    }, 320);
}

function setupInfiniteScroll() {
    const sentinel = document.createElement('div');
    sentinel.style.height = '20px';
    document.getElementById('grid').appendChild(sentinel);

    observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading) {
            loadMore();
        }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
}

function setupSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterAndRender();
        }, 200);
    });
}

function setupLoadMoreButton() {
    document.getElementById('load-more-button').addEventListener('click', loadMore);
}

function setupModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.getElementById('modal-close');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });
}

function showModal(item) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-image').src = `../images/${currentCategory}/${item.image}`;
    document.getElementById('modal-image').alt = item.name;
    document.getElementById('modal-name').textContent = item.name;
    const badge = document.getElementById('modal-rarity');
    badge.textContent = item.rarity.toUpperCase();
    badge.className = `modal-rarity-badge`;
    badge.style.background = `var(--${item.rarity})`;

    modal.classList.add('show');
}

function setupKeyboard() {
    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.getElementById('search-input') !== document.activeElement) {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }
    });
}

function saveState() {
    const category = currentCategory;
    const state = {
        search: document.getElementById('search-input').value,
        scroll: window.scrollY
    };
    sessionStorage.setItem(`dmvs-state-${category}`, JSON.stringify(state));
}

function restoreState() {
    const category = currentCategory;
    const saved = sessionStorage.getItem(`dmvs-state-${category}`);
    if (saved) {
        savedState = JSON.parse(saved);
        if (savedState.search) {
            document.getElementById('search-input').value = savedState.search;
        }
    }
}

async function loadData() {
    const jsonUrl = `../data/${currentCategory}.json`;
    const err = document.getElementById('error-state');
    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty-state');

    err.classList.add('hidden');
    empty.classList.add('hidden');
    grid.classList.add('hidden');

    try {
        const rawData = await fetchData(jsonUrl);
        allData = rawData.filter(validateItem);
        restoreState();
        filterAndRender();
        if (allData.length > CONFIG.PAGE_SIZE) {
            setupInfiniteScroll();
        }
        setTimeout(() => {
            if (savedState && savedState.scroll) {
                window.scrollTo({ top: savedState.scroll, behavior: 'instant' });
            }
        }, 120);
    } catch (e) {
        grid.classList.add('hidden');
        err.classList.remove('hidden');
    }
}

async function init() {
    currentCategory = getCategory();
    document.getElementById('category-title').textContent = getCategoryTitle(currentCategory);

    await loadData();

    setupSearch();
    setupLoadMoreButton();
    setupModal();
    setupKeyboard();

    document.getElementById('clear-search').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        filterAndRender();
    });

    document.getElementById('retry-button').addEventListener('click', loadData);

    window.addEventListener('beforeunload', saveState);

    const resizeHandler = () => {
        if (window.innerWidth < 768) {
            const grid = document.getElementById('grid');
            grid.style.minHeight = `${window.innerHeight * 0.75}px`;
        }
    };
    window.addEventListener('resize', resizeHandler);
    resizeHandler();
}

document.addEventListener('DOMContentLoaded', init);
