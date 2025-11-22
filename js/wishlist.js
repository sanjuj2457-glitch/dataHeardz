'use strict';

(function () {
    const KEY = 'dh_wishlist';

    function safeParse(raw) {
        try { return raw ? JSON.parse(raw) : []; }
        catch (e) { return []; }
    }

    function save(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list || [])); } catch (e) { }
    }

    // Public API so other scripts (like script.js) can reuse it
    window.getWishlist = function () {
        return safeParse(localStorage.getItem(KEY));
    };

    window.removeFromWishlist = function (id) {
        const list = window.getWishlist().filter(i => String(i.id) !== String(id));
        save(list);
        return list;
    };

    window.clearWishlist = function () {
        save([]);
    };

    function renderWishlist() {
        const grid = document.getElementById('wishlist-grid');
        const empty = document.getElementById('wishlist-empty');
        if (!grid || !empty) return;

        const items = window.getWishlist();
        grid.innerHTML = '';

        if (!items.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;

        items.forEach(item => {
            const card = document.createElement('article');
            card.className = 'wish-card';

            const img = document.createElement('img');
            img.className = 'wish-thumb';
            img.src = item.image || 'assets/images/placeholder.png';
            img.alt = item.title || 'Product';
            card.appendChild(img);

            const title = document.createElement('h2');
            title.className = 'wish-title';
            if (item.link) {
                const a = document.createElement('a');
                a.href = item.link;
                a.textContent = item.title || '';
                a.style.textDecoration = 'none';
                a.style.color = 'inherit';
                title.appendChild(a);
            } else {
                title.textContent = item.title || '';
            }
            card.appendChild(title);

            if (item.priceNow || item.priceOld) {
                const price = document.createElement('div');
                price.className = 'wish-price';
                const now = item.priceNow ? Number(item.priceNow) : null;
                const old = item.priceOld ? Number(item.priceOld) : null;

                price.textContent = [
                    now != null && !Number.isNaN(now) ? `Now: $${now.toFixed(2)}` : '',
                    old != null && !Number.isNaN(old) ? `(Was $${old.toFixed(2)})` : ''
                ].filter(Boolean).join(' ');

                card.appendChild(price);
            }

            const actions = document.createElement('div');
            actions.className = 'wish-actions';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn outline';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                window.removeFromWishlist(item.id);
                renderWishlist();
            });

            const viewBtn = document.createElement('a');
            viewBtn.className = 'btn';
            viewBtn.textContent = 'View / Buy';
            if (item.link) {
                viewBtn.href = item.link;
            } else {
                viewBtn.href = '#';
                viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('No product link available');
                });
            }

            actions.appendChild(removeBtn);
            actions.appendChild(viewBtn);
            card.appendChild(actions);

            grid.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderWishlist();

        const clearBtn = document.getElementById('clear-wishlist');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!confirm('Clear all wishlist items?')) return;
                window.clearWishlist();
                renderWishlist();
            });
        }
    });
})();
