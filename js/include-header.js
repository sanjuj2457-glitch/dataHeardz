// js/include-header.js
(function () {
    const headerPlaceholderId = 'site-header';
    const headerUrl = '/header.html'; // adjust path if you move header fragment

    function fetchAndInsertHeader() {
        const container = document.getElementById(headerPlaceholderId);
        if (!container) return Promise.resolve();

        return fetch(headerUrl, { cache: 'no-store' })
            .then(resp => {
                if (!resp.ok) throw new Error('Failed to fetch header: ' + resp.status);
                return resp.text();
            })
            .then(html => {
                container.innerHTML = html;
                window.dispatchEvent(new CustomEvent('header-included', { detail: { url: headerUrl } }));
            })
            .catch(err => {
                console.error('include-header:', err);
                if (container && container.innerHTML.trim() === '') {
                    container.innerHTML = '<header class="header"><div class="container"><a href="/">Home</a> • <a href="dataheardz-life.html">DataHeardz Life</a></div></header>';
                }
                window.dispatchEvent(new CustomEvent('header-included', { detail: { url: headerUrl, error: err } }));
            });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fetchAndInsertHeader);
    else fetchAndInsertHeader();
})();
