/* script.js — consolidated, cleaned & improved for DataHeardz
   Dependencies (keep these in your HTML):
   - GLightbox (https://cdn.jsdelivr.net/npm/glightbox)
   - SheetJS (https://cdn.sheetjs.com/xlsx-latest/)
*/

'use strict';

/* ---------------------------
   Utilities (single definitions)
   --------------------------- */
const $ = (sel, root = document) => (root || document).querySelector(sel);
const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));

function looksLikeWindowsPath(s) {
    if (!s || typeof s !== 'string') return false;
    return /^[A-Za-z]:[\\/]/.test(s) || /^\\\\/.test(s);
}
function looksLikeUrl(s) {
    if (!s || typeof s !== 'string') return false;
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
}
function basename(path) {
    if (!path) return '';
    path = path.replace(/\\/g, '/');
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
}
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return s.toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
function isVideo(url) {
    if (!url) return false;
    // allow query strings; check extension only at end-of-path (before query/hash)
    const clean = url.split('?')[0].split('#')[0];
    return /\.(mp4|webm|ogg|m4v)$/i.test(clean);
}
function resolveImageSrc(raw) {
    if (!raw) return '';
    raw = raw.toString().trim();

    // 1. URL → keep as-is
    if (looksLikeUrl(raw)) return raw;

    // 2. Already has assets/... → keep as-is
    if (/^assets\//i.test(raw)) {
        return raw.replace(/\\/g, '/');
    }

    // 3. Windows path → extract filename
    if (looksLikeWindowsPath(raw)) {
        raw = basename(raw);
    }

    const file = encodeURIComponent(raw);

    // 4. Detect page: DataHeardz Life or Home
    const onLifePage =
        window.location.pathname.includes('dataheardz-life') ||
        window.location.href.includes('dataheardz-life');

    if (onLifePage) {
        // DataHeardz Life → use life image folder
        return `assets/dataheardz_life_Images/${file}`;
    }

    // Default for Home Page → normal images
    return `assets/images/${file}`;
}



/* ---------------------------
   GLightbox init
   --------------------------- */
let lightbox = null;
function initLightbox() {
    if (typeof GLightbox === 'undefined') return;
    if (lightbox && typeof lightbox.destroy === 'function') lightbox.destroy();
    lightbox = GLightbox({ selector: '.glightbox', plyr: { config: { ratio: '16:9' } } });
}

/* ---------------------------
   Gallery builder
   --------------------------- */
/* ---------------------------
   Gallery builder
   --------------------------- */
const galleryEl = document.getElementById('media-gallery');

function buildGallery(rows) {
    if (!galleryEl) return;
    console.debug('[gallery] build start, rows:', (rows || []).length);

    galleryEl.innerHTML = '';

    const visible = (rows || []).filter(r => {
        const showValue = (r?.Show ?? r?.show ?? r?.SHOW ?? '').toString().trim().toLowerCase();
        return showValue === 'yes';
    });

    if (!visible.length) {
        galleryEl.innerHTML = '<div class="hint">No gallery items to show.</div>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'gallery-grid';

    visible.forEach((row, idx) => {
        const raw = row?.Image ?? row?.image ?? row?.IMAGE ?? '';
        const src = resolveImageSrc(raw);
        const descRaw = row?.Description ?? row?.description ?? row?.DESC ?? '';
        const desc = escapeHtml(descRaw);

        const linkRaw = (row?.Link ?? row?.link ?? row?.LINK ?? '').toString().trim();
        const posterRaw = (row?.Poster ?? row?.poster ?? row?.POSTER ?? '').toString().trim();
        const poster = posterRaw ? resolveImageSrc(posterRaw) : '';

        // If Link is present, we use that as the click target (external page).
        // If not, we fall back to the image src and use GLightbox.
        const hasExternalLink = !!linkRaw;
        const href = hasExternalLink ? linkRaw : (src || '');

        const item = document.createElement('figure');
        item.className = 'gallery-item';

        const useLightbox = !hasExternalLink && !!href;
        const a = document.createElement('a');

        if (useLightbox) {
            // Lightbox behaviour (no external link in sheet)
            a.className = 'glightbox';
            a.setAttribute('href', href);
            a.setAttribute('data-gallery', 'excel-gallery');
            a.setAttribute('data-type', isVideo(href) ? 'video' : 'image');
            if (poster && isVideo(href)) a.setAttribute('data-poster', poster);
            a.setAttribute('aria-label', desc ? `Open ${descRaw}` : `Open media ${idx + 1}`);
        } else {
            // External product link behaviour (Link column filled)
            a.className = 'gallery-thumb-wrap';
            a.setAttribute('href', href);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.setAttribute(
                'aria-label',
                desc ? `Open link for ${descRaw}` : `Open product ${idx + 1}`
            );
        }

        // Thumbnail rendering
        if (!hasExternalLink && isVideo(href)) {
            // only treat as inline video when using lightbox
            if (poster) {
                const img = document.createElement('img');
                img.className = 'gallery-thumb';
                img.loading = 'lazy';
                img.alt = desc || basename(href) || `video-${idx + 1}`;
                img.src = poster;
                a.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.playsInline = true;
                video.muted = true;
                video.setAttribute('aria-hidden', 'true');
                video.className = 'gallery-thumb';
                const source = document.createElement('source');
                source.src = href;
                source.type = /\.mp4$/i.test(href) ? 'video/mp4' : '';
                video.appendChild(source);
                a.appendChild(video);
            }
        } else {
            // normal image thumbnail
            const img = document.createElement('img');
            img.className = 'gallery-thumb';
            img.loading = 'lazy';
            img.alt = desc || basename(src) || `media-${idx + 1}`;
            img.src = src || href || '';
            a.appendChild(img);
        }

        item.appendChild(a);

        if (desc) {
            const figcaption = document.createElement('figcaption');
            figcaption.className = 'gallery-caption';
            figcaption.innerHTML = desc; // already escaped
            item.appendChild(figcaption);
        }

        // We no longer need the little "→" external link, because the main
        // thumbnail already goes to the link when Link is present.

        list.appendChild(item);
    });

    galleryEl.appendChild(list);
    initLightbox();
}


/* ---------------------------
   Excel loader (SheetJS)
   --------------------------- */
function parseWorkbookArrayBuffer(buf) {
    const data = new Uint8Array(buf);
    const workbook = XLSX.read(data, { type: 'array' });

    // primary sheet (used by existing buildGallery flow)
    const first = workbook.SheetNames[0];
    const sheet = workbook.Sheets[first];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // find a "Products" sheet (case-insensitive), if present
    const productsSheetName = workbook.SheetNames.find(n => /^products$/i.test(n));
    if (productsSheetName) {
        try {
            const prodSheet = workbook.Sheets[productsSheetName];
            const prodRows = XLSX.utils.sheet_to_json(prodSheet, { defval: '' });
            // store for later mapping; not returned directly to keep backward compatibility
            window._EXCEL_PRODUCT_ROWS = prodRows;
        } catch (err) {
            console.warn('[parseWorkbook] failed to read Products sheet', err);
            delete window._EXCEL_PRODUCT_ROWS;
        }
    } else {
        // If no explicit Products sheet, remove any previous cached product rows
        delete window._EXCEL_PRODUCT_ROWS;
    }

    return rows;
}
// Map Excel rows to SPA product objects
function parseNumber(v, fallback = 0) {
    if (v === null || v === undefined || v === '') return fallback;
    const n = Number(String(v).toString().replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
}

function rowsToProducts(rows) {
    if (!Array.isArray(rows)) return [];
    const products = [];
    let nextId = 1;

    function extractLink(val) {
        if (!val) return '';

        // Case 1: Excel Hyperlink Object
        if (typeof val === 'object') {
            // Standard SheetJS hyperlink format
            if (val.l && val.l.Target) {
                return String(val.l.Target).trim();
            }
            // Some formats use lowercase
            if (val.l && val.l.target) {
                return String(val.l.target).trim();
            }
            // Sometimes the visible text IS the URL
            if (val.v) return String(val.v).trim();
        }

        // Case 2: Plain string URL
        return String(val).trim();
    }

    function normalizeUrl(u) {
        if (!u) return '';
        u = String(u).trim();
        // if already valid URL
        try { return new URL(u).href; } catch (e) { }
        // looks like "example.com"
        if (/^[\w-]+\.[\w-]+/.test(u)) return 'https://' + u;
        return u;
    }

    function parseNumber(v, fallback = 0) {
        if (v === null || v === undefined || v === '') return fallback;
        const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(n) ? n : fallback;
    }

    rows.forEach(r => {
        const title = r.Title || r.title || r.Product || r.product || r.Name || r.name || '';
        if (!title) return;

        const linkRaw = r.Link || r.link || r.URL || r.url || r.ProductLink || r.productLink || '';

        const product = {
            id: r.ID || r.id || nextId++,
            title: String(title).trim(),
            image: resolveImageSrc(r.Image || r.image || ''),
            rating: parseNumber(r.Rating || r.rating || 0),
            reviews: parseNumber(r.Reviews || r.reviews || 0),
            priceOld: parseNumber(r.PriceOld || r.priceOld || 0),
            priceNow: parseNumber(r.PriceNow || r.priceNow || r.Price || r.price || 0),
            action: ((r.Action || '').toString().toLowerCase() === 'cart') ? 'cart' : 'waitlist',

            // ---- THE FIX ----
            link: normalizeUrl(extractLink(linkRaw))
        };

        products.push(product);
    });

    return products;
}






function fetchExcelFromServer(url) {
    console.debug('[fetchExcel] fetching', url);
    return fetch(url).then(resp => {
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        return resp.arrayBuffer();
    }).then(buf => parseWorkbookArrayBuffer(buf));
}
function handleFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve([]);
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const rows = parseWorkbookArrayBuffer(e.target.result);
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = function (err) { reject(err); };
        reader.readAsArrayBuffer(file);
    });
}

/* ---------------------------
   Accessible mobile drawer (focus trap)
   --------------------------- */
(function initDrawer() {
    const btn = document.querySelector('.hamburger');
    const drawer = document.getElementById('mobile-drawer');
    if (!btn || !drawer) return;

    drawer.setAttribute('tabindex', '-1');
    const focusableSelector = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
    let lastFocusedBeforeOpen = null;

    const getFocusable = () => Array.from(drawer.querySelectorAll(focusableSelector)).filter(el => !el.hasAttribute('disabled'));

    function open() {
        lastFocusedBeforeOpen = document.activeElement;
        btn.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        const focusables = getFocusable();
        if (focusables.length) focusables[0].focus();
        else drawer.focus();
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focus', trapFocus, true);
    }
    function close() {
        btn.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        drawer.removeAttribute('role');
        drawer.removeAttribute('aria-modal');
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('focus', trapFocus, true);
        if (lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') lastFocusedBeforeOpen.focus();
    }
    function trapFocus(e) {
        if (drawer.getAttribute('aria-hidden') === 'true') return;
        if (!drawer.contains(e.target)) {
            const focusables = getFocusable();
            if (focusables.length) focusables[0].focus();
            else drawer.focus();
            e.stopPropagation();
        }
    }
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            if (drawer.getAttribute('aria-hidden') === 'false') close();
        } else if (e.key === 'Tab') {
            const focusables = getFocusable();
            if (!focusables.length) { e.preventDefault(); return; }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        expanded ? close() : open();
    });

    document.addEventListener('click', (e) => {
        if (drawer.getAttribute('aria-hidden') === 'true') return;
        if (!drawer.contains(e.target) && !btn.contains(e.target)) close();
    });

    drawer.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') close();
    });
})();

/* ---------------------------
   Desktop mega menu keyboard support
   --------------------------- */
(function initMegaMenu() {
    const items = $$('.menu-item');
    const menuLinks = $$('.menu-link');

    document.querySelectorAll('.mega').forEach(panel => panel.setAttribute('tabindex', '-1'));

    items.forEach(item => {
        const link = item.querySelector('.menu-link');
        const panel = item.querySelector('.mega');
        if (!link || !panel) return;

        const open = () => { link.setAttribute('aria-expanded', 'true'); panel.style.display = 'block'; };
        const close = () => { link.setAttribute('aria-expanded', 'false'); panel.style.display = ''; };

        item.addEventListener('mouseenter', open);
        item.addEventListener('mouseleave', close);
        link.addEventListener('focus', open);

        panel.addEventListener('focusout', (e) => {
            if (!item.contains(e.relatedTarget)) close();
        });

        link.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key === 'Enter' || key === ' ') {
                e.preventDefault();
                const expanded = link.getAttribute('aria-expanded') === 'true';
                expanded ? close() : open();
            }
            if (key === 'ArrowRight' || key === 'ArrowLeft') {
                e.preventDefault();
                const idx = menuLinks.indexOf(link);
                if (idx >= 0) {
                    const nextIdx = key === 'ArrowRight' ? (idx + 1) % menuLinks.length : (idx - 1 + menuLinks.length) % menuLinks.length;
                    menuLinks[nextIdx].focus();
                }
            }
            if (key === 'ArrowDown') {
                e.preventDefault();
                const firstInPanel = panel.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
                if (firstInPanel) firstInPanel.focus();
            }
        });

        const panelLinks = Array.from(panel.querySelectorAll('a'));
        panelLinks.forEach((a, i) => {
            a.setAttribute('role', 'menuitem');
            a.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); panelLinks[(i + 1) % panelLinks.length].focus(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); panelLinks[(i - 1 + panelLinks.length) % panelLinks.length].focus(); }
                else if (e.key === 'Home') { e.preventDefault(); panelLinks[0].focus(); }
                else if (e.key === 'End') { e.preventDefault(); panelLinks[panelLinks.length - 1].focus(); }
                else if (e.key === 'Escape') { e.preventDefault(); link.focus(); close(); }
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu')) {
            document.querySelectorAll('.menu-link[aria-expanded="true"]').forEach(l => l.setAttribute('aria-expanded', 'false'));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.menu-link[aria-expanded="true"]').forEach(l => l.setAttribute('aria-expanded', 'false'));
        }
    });
})();

/* ---------------------------
   Category SPA (single merged implementation)
   - Opens DataHeardz Life category, renders product grid, sorting
   - Allows optional window.SHEET_PRODUCTS override (from Excel -> mapped to product objects)
   --------------------------- */
(function categorySPA() {
    const defaultProducts = [
        { id: 1, title: 'Ultimate Krill Oil', image: 'https://via.placeholder.com/300x300.png?text=Krill+Oil', rating: 5.0, reviews: 147, priceOld: 59.95, priceNow: 41.95, action: 'waitlist' },
        { id: 2, title: 'DNA Force Plus', image: 'https://via.placeholder.com/300x300.png?text=DNA+Force', rating: 4.9, reviews: 236, priceOld: 199.95, priceNow: 149.95, action: 'waitlist' },
        { id: 3, title: 'Vitamin C with Zinc', image: 'https://via.placeholder.com/300x300.png?text=Vitamin+C', rating: 5.0, reviews: 101, priceOld: 39.95, priceNow: 29.95, action: 'waitlist' },
        { id: 4, title: 'Ultimate Fish Oil', image: 'https://via.placeholder.com/300x300.png?text=Fish+Oil', rating: 5.0, reviews: 135, priceOld: 49.95, priceNow: 29.95, action: 'cart' },
        { id: 5, title: 'Immunity Pack', image: 'https://via.placeholder.com/300x300.png?text=Immunity+Pack', rating: 4.8, reviews: 78, priceOld: 69.95, priceNow: 49.95, action: 'cart' }
    ];

    function getProducts() {
        // If user maps Excel rows -> products and sets window.SHEET_PRODUCTS, prefer that
        if (Array.isArray(window.SHEET_PRODUCTS) && window.SHEET_PRODUCTS.length) return window.SHEET_PRODUCTS;
        return defaultProducts;
    }

    function renderStars(r) {
        const full = Math.round(r || 0);
        return `<span aria-hidden="true" style="color:#ffb020;font-weight:800;">${'★'.repeat(full)}</span>`;
    }

    function ensureContainers() {
        const mainContent = document.querySelector('.main-content');
        const menubar = document.querySelector('.menubar');
        const parent = mainContent ? mainContent.parentNode : (menubar ? menubar.parentNode : document.body);

        let toolbar = document.querySelector('.page-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'page-toolbar';
            toolbar.innerHTML = `
                <div class="container">
                  <nav class="breadcrumb" aria-label="Breadcrumb">
                    <ol class="breadcrumb-list">
                      <li><a href="#" data-nav="home">Home</a></li>
                      <li><a href="#" data-nav="health">Health & Wellness</a></li>
                      <li aria-current="page">DataHeardz Life</li>
                    </ol>
                  </nav>
                  <div class="category-title-row">
                    <div class="category-title">DATAHEARDZ LIFE</div>
                    <div class="category-controls">
                      <label for="ch-sort">Sort By</label>
                      <select id="ch-sort" aria-label="Sort products">
                        <option value="position">Position</option>
                        <option value="name">Name</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>
                  </div>
                </div>`;
            if (mainContent) parent.insertBefore(toolbar, mainContent);
            else if (menubar) menubar.parentNode.insertBefore(toolbar, menubar.nextSibling);
            else document.body.insertBefore(toolbar, document.body.firstChild);
        }

        let grid = document.getElementById('product-list');
        if (!grid) {
            grid = document.createElement('section');
            grid.id = 'product-list';
            grid.className = 'product-grid';
            if (mainContent) mainContent.appendChild(grid);
            else toolbar.parentNode.insertBefore(grid, toolbar.nextSibling);
        }

        return { toolbar, grid };
    }
    // --- Wishlist fallback stub (safe) ---
    // If real wishlist.js hasn't loaded yet, provide a minimal compatible API.
    // If wishlist.js loads later it will overwrite these functions.
    if (typeof window.addToWishlist !== 'function') {
        (function () {
            const KEY = 'dh_wishlist';

            function safeParse(raw, fallback) {
                try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
            }
            function save(list) {
                try { localStorage.setItem(KEY, JSON.stringify(list || [])); } catch (e) { }
            }
            function getList() { return safeParse(localStorage.getItem(KEY), []); }
            function idEq(a, b) { if (a === b) return true; if (a == null || b == null) return false; return String(a) === String(b); }

            window.addToWishlist = function (product) {
                if (!product || (!product.id && !product.title)) return false;
                const list = getList();
                const exists = list.some(it => (product.id != null && it.id != null && idEq(it.id, product.id)) ||
                    (it.title === product.title && (it.link || '') === (product.link || '')));
                if (exists) return false;
                const toStore = {
                    id: product.id ?? Date.now(),
                    title: String(product.title || '').trim(),
                    image: product.image || '',
                    link: product.link || '',
                    priceNow: product.priceNow || '',
                    priceOld: product.priceOld || ''
                };
                list.push(toStore);
                save(list);
                // try to update badge if present
                try {
                    const chip = document.querySelector('.chip[href="#wishlist"], a[href="wishlist.html"], a[href*="wishlist"]');
                    if (chip) {
                        let badge = chip.querySelector('.badge');
                        if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; chip.appendChild(badge); }
                        badge.textContent = getList().length || '';
                        badge.style.display = getList().length ? 'inline-block' : 'none';
                    }
                } catch (e) { }
                return true;
            };

            window.getWishlist = function () { return getList(); };
            window.removeFromWishlist = function (id) {
                const list = getList().filter(i => !idEq(i.id, id));
                save(list);
                return list;
            };
        })();
    }

    function renderProducts(list) {
        const { grid } = ensureContainers();
        // make sure grid exists
        if (!grid) return;

        // keep a live reference that the delegated handler can always use
        window._CURRENT_PRODUCTS = Array.isArray(list) ? list : [];

        // clear previous content but keep any one-time wiring
        grid.innerHTML = '';

        list.forEach(p => {
            const card = document.createElement('article');
            card.className = 'product-card';

            // image
            const img = document.createElement('img');
            img.className = 'product-thumb';
            img.src = String(p.image || '').trim();
            img.alt = escapeHtml(p.title || '');
            card.appendChild(img);

            // title
            const title = document.createElement('div');
            title.className = 'product-title';
            title.textContent = p.title || '';
            card.appendChild(title);

            // rating row
            const ratingRow = document.createElement('div');
            ratingRow.className = 'rating-row';
            ratingRow.innerHTML = `${renderStars(p.rating)} <span style="color:var(--muted); font-size:13px; margin-left:6px;">${Number(p.rating || 0).toFixed(1)} • ${Number(p.reviews || 0)} reviews</span>`;
            card.appendChild(ratingRow);

            // price row
            const priceRow = document.createElement('div');
            priceRow.className = 'price-row';
            const oldDiv = document.createElement('div');
            oldDiv.className = 'price-old';
            oldDiv.textContent = `$${Number(p.priceOld || 0).toFixed(2)}`;
            const nowDiv = document.createElement('div');
            nowDiv.className = 'price-now';
            nowDiv.textContent = `Now: $${Number(p.priceNow || 0).toFixed(2)}`;
            priceRow.appendChild(oldDiv);
            priceRow.appendChild(nowDiv);
            card.appendChild(priceRow);

            // actions
            const actions = document.createElement('div');
            actions.className = 'card-actions';

            // Only show "Join Waiting List" when action === 'waitlist'.
            // Otherwise do not show a primary action button.
            /*   if (p.action === 'waitlist') {
                    const waitBtn = document.createElement('button');
                    waitBtn.className = 'btn-wait';
                    waitBtn.dataset.id = p.id;
                    waitBtn.textContent = 'Join Waiting List';
                    actions.appendChild(waitBtn);
                }*/

            // View button (always shown)
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-view';
            viewBtn.dataset.id = p.id;
            // Store link directly on the button for fast access (and keep it even if list changes)
            viewBtn.dataset.link = p.link || '';
            viewBtn.textContent = 'View';
            actions.appendChild(viewBtn);

            card.appendChild(actions);
            grid.appendChild(card);
        });

        /* ----------------------
           Event delegation - attach once per grid
           ---------------------- */
        if (!grid.dataset.wired) {
            grid.addEventListener('click', (e) => {
                // WAITLIST (btn-wait)
                const waitBtn = e.target.closest('.btn-wait');
                if (waitBtn) {
                    const id = waitBtn.dataset.id;
                    // look up using live product reference
                    const product = (window._CURRENT_PRODUCTS || []).find(x => String(x.id) === String(id));
                    if (!product) {
                        console.warn('[wishlist] product not found for id', id);
                        alert('Product information missing — try refreshing the page.');
                        return;
                    }

                    const wishlistItem = {
                        id: product.id ?? Date.now(),
                        title: product.title || '',
                        image: product.image || '',
                        link: product.link || '',
                        priceNow: product.priceNow || '',
                        priceOld: product.priceOld || ''
                    };

                    const added = (typeof window.addToWishlist === 'function')
                        ? window.addToWishlist(wishlistItem)
                        : (function localAdd(item) {
                            try {
                                const KEY = 'dh_wishlist';
                                const raw = localStorage.getItem(KEY) || '[]';
                                const listLocal = JSON.parse(raw);
                                const exists = listLocal.some(it => String(it.id) === String(item.id) || (it.title === item.title && (it.link || '') === (item.link || '')));
                                if (exists) return false;
                                listLocal.push(item);
                                localStorage.setItem(KEY, JSON.stringify(listLocal));
                                return true;
                            } catch (err) {
                                console.error('[localAdd] failed', err);
                                return false;
                            }
                        })(wishlistItem);

                    if (added) {
                        try {
                            const listNow = (window.getWishlist && typeof window.getWishlist === 'function') ? window.getWishlist() : JSON.parse(localStorage.getItem('dh_wishlist') || '[]');
                            const count = Array.isArray(listNow) ? listNow.length : (JSON.parse(localStorage.getItem('dh_wishlist') || '[]').length);
                            let badge = document.querySelector('.badge[data-for="wishlist"]') || document.querySelector('.chip .badge') || document.querySelector('a[href*="wishlist"] .badge') || document.querySelector('.badge');
                            if (badge) badge.textContent = count || '';
                        } catch (err) { /* non-fatal */ }

                        alert(product.title + ' added to wishlist.');
                        console.info('[wishlist] added', wishlistItem);
                    } else {
                        alert(product.title + ' is already in your wishlist.');
                        console.info('[wishlist] not added (duplicate)', wishlistItem);
                    }

                    return;
                }

                // VIEW (btn-view)
                const viewBtn = e.target.closest('.btn-view');
                if (viewBtn) {
                    // Prefer the data-link stored on the button (fast), fallback to current products list
                    const linkFromAttr = (viewBtn.dataset && viewBtn.dataset.link) ? String(viewBtn.dataset.link).trim() : '';
                    let link = linkFromAttr;

                    if (!link) {
                        const id = viewBtn.dataset.id;
                        const product = (window._CURRENT_PRODUCTS || []).find(x => String(x.id) === String(id));
                        link = product ? (product.link || '') : '';
                    }

                    if (link) {
                        // Open in new tab so user doesn't lose category view
                        try {
                            window.open(link, '_blank', 'noopener');
                        } catch (err) {
                            // fallback to same-tab navigation
                            window.location.href = link;
                        }
                    } else {
                        alert('No link found for this product.');
                    }
                    return;
                }
            });

            // mark as wired so we don't attach multiple listeners on re-render
            grid.dataset.wired = '1';
        }
    }




    function sortProducts(mode, products) {
        const arr = [...products];
        if (mode === 'name') arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (mode === 'price-asc') arr.sort((a, b) => Number(a.priceNow || 0) - Number(b.priceNow || 0));
        else if (mode === 'price-desc') arr.sort((a, b) => Number(b.priceNow || 0) - Number(a.priceNow || 0));
        else if (mode === 'rating') arr.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        return arr;
    }

    function openCategory(pushState = true) {
        const products = getProducts();
        renderProducts(products);
        if (pushState && history.pushState) history.pushState({ page: 'dataheardz-life' }, '', '#dataheardz-life');

        const sel = document.querySelector('#ch-sort');
        if (sel && !sel.dataset.wired) {
            sel.addEventListener('change', (e) => {
                const sorted = sortProducts(e.target.value, products);
                renderProducts(sorted);
            });
            sel.dataset.wired = '1';
        }

        // mark menu active (best-effort)
        $$('.menu-link, .menu a, .main-nav a').forEach(el => el.classList.remove('is-active', 'active'));
        const possible = $$('.menu-link, .menu a, .main-nav a').find(a => /dataheardz|life/i.test((a.textContent || '').trim()));
        if (possible) possible.classList.add('active', 'is-active');
    }

    // wire menu links that mention "life" or "dataheardz"
    function wireMenuClicks() {
        const candidates = $$('.menu-link, .menu a, .main-nav a, .menu-item > a');
        candidates.forEach(a => {
            if (/dataheardz|life/i.test((a.textContent || ''))) {
                // determine the href we should navigate to
                let href = a.getAttribute('href') || '';
                // if the link is empty or just a hash, default to our real page
                if (!href || href.trim() === '#') href = 'dataheardz-life.html';

                // ensure the DOM anchor actually points to the page (so right-click/open in new tab works)
                a.setAttribute('href', href);

                a.addEventListener('click', (e) => {
                    // If we're already on the category page, use SPA open (no full navigation)
                    const onCategoryPage = window.location.pathname.includes('dataheardz-life');
                    if (onCategoryPage) {
                        e.preventDefault();
                        // openCategory is the SPA renderer defined in script.js
                        if (typeof openCategory === 'function') openCategory(true);
                        const target = document.getElementById('product-list') || document.querySelector('.page-toolbar');
                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        // Not on the category page — allow navigation to the real page.
                        // If href is same-page hash, still navigate to the page.
                        // Do not call e.preventDefault() so user can open in new tab / ctrl+click.
                        // But for single-page-friendly click (no modifier), do a direct location change to avoid duplicate handlers.
                        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                            // let normal navigation happen by setting location — ensures consistent behavior
                            // (we don't call preventDefault so that right-click/open-in-new-tab still works)
                            // If anchor already had the correct href this will do a normal navigation.
                            // No extra action required here.
                        }
                    }
                });
            }
        });
    }


    window.addEventListener('popstate', (e) => {
        const state = e.state || {};
        if (state.page === 'dataheardz-life' || location.hash === '#dataheardz-life') openCategory(false);
        else {
            const toolbar = document.querySelector('.page-toolbar');
            const grid = document.getElementById('product-list');
            if (grid) grid.remove();
            if (toolbar) toolbar.remove();
        }
    });
    function initProductSorting() {
        const productList = document.getElementById('product-list');
        const sortSelect = document.getElementById('page-sort-select');

        if (!productList || !sortSelect) return;

        // Re-build the cards array every time we init (in case another script rebuilt the grid)
        const cards = Array.from(productList.querySelectorAll('.product-card')).map((card, index) => {
            // Rating
            const ratingEl = card.querySelector('[itemprop="ratingValue"]');
            const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) || 0 : 0;

            // Price (current)
            const priceEl = card.querySelector('.current-price [itemprop="price"]');
            const price = priceEl ? parseFloat(priceEl.textContent.trim()) || 0 : 0;

            return {
                card,
                index,  // original order
                rating,
                price,
            };
        });

        // If no cards, do nothing
        if (cards.length === 0) return;

        function renderSorted(criteria) {
            const sorted = [...cards];

            switch (criteria) {
                case 'rating':
                    sorted.sort((a, b) => b.rating - a.rating);
                    break;

                case 'price-low-high':
                    sorted.sort((a, b) => a.price - b.price);
                    break;

                case 'price-high-low':
                    sorted.sort((a, b) => b.price - a.price);
                    break;

                case 'featured':
                default:
                    sorted.sort((a, b) => a.index - b.index);
                    break;
            }

            // Re-append the existing card nodes in the new order.
            // We DON'T touch their innerHTML, so all details stay intact.
            sorted.forEach(item => productList.appendChild(item.card));
        }

        // Keep the current visual order as "featured"
        // Only change when user chooses something
        sortSelect.addEventListener('change', function () {
            renderSorted(this.value);
        });
    }


    // Run when DOM is ready
    document.addEventListener('DOMContentLoaded', initProductSorting);

    // expose a manual opener
    window.openDataHeardzLife = openCategory;

    // init on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        wireMenuClicks();
        if (location.hash === '#dataheardz-life') openCategory(false);
    });
})();

/* ---------------------------
   Wiring: file inputs, load sample, server fetch
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // file inputs (if present)
    const fileInputs = [document.getElementById('excel-file'), document.getElementById('excel-file-duplicate')].filter(Boolean);
    const loadButtons = [document.getElementById('load-sample'), document.getElementById('load-sample-duplicate')].filter(Boolean);

    fileInputs.forEach(inp => {
        inp.addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            try {
                const rows = await handleFile(f);

                // keep existing gallery behavior (no change)
                buildGallery(rows);

                // If the workbook included a "Products" sheet, parse it; else try to derive products from the current rows
                let productRows = window._EXCEL_PRODUCT_ROWS || null;

                // If no explicit Products sheet found, optionally detect product-like rows in the first sheet
                if (!productRows) {
                    // Heuristic: if the first sheet has Title/Product/Name columns, treat it as products
                    const firstRow = rows && rows[0] ? rows[0] : null;
                    if (firstRow && (firstRow.Title || firstRow.title || firstRow.Product || firstRow.product || firstRow.Name || firstRow.name)) {
                        productRows = rows;
                    }
                }

                if (productRows && productRows.length) {
                    try {
                        const mapped = rowsToProducts(productRows);
                        if (mapped && mapped.length) {
                            window.SHEET_PRODUCTS = mapped;
                            // If we're on the category page, re-render product list immediately:
                            if (window.location.pathname.includes('dataheardz-life') && typeof openDataHeardzLife === 'function') {
                                openDataHeardzLife();
                            }
                        }
                    } catch (err) {
                        console.error('rowsToProducts mapping failed', err);
                    }
                }

                // Optionally map rows to products and expose them:
                // window.SHEET_PRODUCTS = rowsToProducts(rows); // implement mapping if needed
            } catch (err) {
                console.error('Failed to parse uploaded Excel', err);
                if (galleryEl) galleryEl.innerHTML = `<div class="hint" style="color:salmon">Failed to parse Excel: ${escapeHtml(err?.message || 'Unknown')}</div>`;
            }
        });
    });

    loadButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const sample = [
                { Show: 'Yes', Image: 'photo1.jpg', Description: 'Local filename (photo1.jpg) -> assets/images/photo1.jpg', Link: '' },
                { Show: 'Yes', Image: 'assets/images/photo2.jpg', Description: 'Relative path used as-is', Link: '' },
                { Show: 'Yes', Image: 'E:\\DataHeardz Store\\assets\\images\\photo3.jpg', Description: 'Windows path - converted to filename', Link: '' },
                { Show: 'Yes', Image: 'https://sample-videos.com/img/Sample-jpg-image-500kb.jpg', Description: 'External URL', Link: '' },
                { Show: 'No', Image: 'hidden.jpg', Description: 'This row should not show', Link: '' }
            ];
            buildGallery(sample);
        });
    });

    // attempt to auto-load server Excel (non-blocking)
    // === load gallery.xlsx AND Products.xlsx (if available) ===
    (function loadServerWorkbooks() {
        const galleryPath = '/assets/data/gallery.xlsx';
        const productsPath = '/assets/data/Products.xlsx';

        // Load gallery first (so the page looks populated quickly)
        fetchExcelFromServer(galleryPath)
            .then(galleryRows => {
                if (galleryRows && galleryRows.length) {
                    buildGallery(galleryRows);
                } else if (galleryEl && galleryEl.children.length === 0) {
                    galleryEl.innerHTML = `<div class="hint">No gallery loaded. Upload an Excel file or click "Load Sample".</div>`;
                }
            })
            .catch(err => {
                console.info('[startup] could not load gallery.xlsx — falling back to sample/hint', err?.message || err);
                if (galleryEl && galleryEl.children.length === 0) {
                    galleryEl.innerHTML = `<div class="hint">No gallery loaded. Upload an Excel file or click "Load Sample".</div>`;
                }
            })
            .finally(() => {
                // Always try to load products.xlsx (non-blocking)
                fetchExcelFromServer(productsPath)
                    .then(prodRows => {
                        // parseExcel may set window._EXCEL_PRODUCT_ROWS when a workbook contains explicit "Products" sheet
                        let productRows = window._EXCEL_PRODUCT_ROWS || prodRows || [];

                        // If nothing found in the explicit products file, try to use detected rows
                        if (!productRows || !productRows.length) {
                            console.info('[startup] Products.xlsx loaded but no rows found (or Products sheet missing).');
                            return;
                        }

                        try {
                            const mapped = rowsToProducts(productRows);
                            if (mapped && mapped.length) {
                                window.SHEET_PRODUCTS = mapped;
                                console.debug('[startup] Loaded products from Excel —', mapped.length, 'items');

                                // If user is on the category page, re-render the product grid immediately
                                if (window.location.pathname.includes('dataheardz-life') && typeof openDataHeardzLife === 'function') {
                                    openDataHeardzLife();
                                }
                                // tie header dropdown to page dropdown if present
                                const pageSelect = document.getElementById('page-sort-select');
                                const spaSelect = document.getElementById('ch-sort');

                                if (pageSelect && spaSelect) {
                                    pageSelect.value = spaSelect.value;
                                    pageSelect.addEventListener('change', () => {
                                        spaSelect.value = pageSelect.value;
                                        spaSelect.dispatchEvent(new Event('change'));
                                    });
                                }

                                // init sorting for visible page select
                                initProductSorting();
                            }
                        } catch (err) {
                            console.error('[startup] rowsToProducts mapping failed', err);
                        }
                    })
                    .catch(err => {
                        // If Products.xlsx not present, it's not fatal — we'll keep using defaults/sample
                        console.info('[startup] could not load Products.xlsx — using defaults or window.SHEET_PRODUCTS if set', err?.message || err);
                    });
            });

        // init GLightbox (safe even if gallery later re-inits)
        initLightbox();
    })();


    // search form (demo)
    const form = document.querySelector('.search');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = new FormData(form).get('q') || '';
            alert('Search: ' + q);
        });
    }
});