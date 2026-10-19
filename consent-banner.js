(function () {
  'use strict';
  var STORAGE_KEY = 'alvento_consent';
  var analyticsLoaded = false;
  function stored() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function save(value) { try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* Choice remains effective on this page. */ } }
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', 'G-XBMBRD8E00');
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XBMBRD8E00';
    document.head.appendChild(script);
  }
  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
      var domains = ['', location.hostname, '.' + location.hostname, 'alvento.uk', '.alvento.uk'];
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }
  function showPreferences(opener) {
    if (document.getElementById('cookie-choices')) return;
    var box = document.createElement('div');
    box.id = 'cookie-choices';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookie preferences');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#141414;color:#e8e8e8;border:1px solid #555;border-radius:8px;padding:20px 24px;font:0.9rem/1.5 sans-serif;box-shadow:0 8px 32px #0006';
    var text = document.createElement('p');
    text.textContent = 'Optional analytics helps us understand page use. It loads only if you accept. Free-tool documents are processed in your browser, separately from page analytics.';
    text.style.margin = '0 0 14px';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';
    function button(label, granted) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'font:600 .85rem sans-serif;padding:12px 20px;border:1px solid #c4f042;border-radius:4px;cursor:pointer;' + (granted ? 'background:#c4f042;color:#0a0a0a' : 'background:#141414;color:#e8e8e8');
      b.addEventListener('click', function () {
        save(granted ? 'granted' : 'denied');
        box.remove();
        if (granted) loadAnalytics();
        else { clearAnalyticsCookies(); if (analyticsLoaded) { location.reload(); return; } }
        if (opener) opener.focus();
      });
      row.appendChild(b); return b;
    }
    var accept = button('Accept analytics', true);
    button('Decline', false);
    var policy = document.createElement('a'); policy.href = '/privacy/'; policy.textContent = 'Privacy policy'; policy.style.cssText = 'color:#c4f042;display:inline-block;margin-top:14px;text-decoration:underline';
    box.appendChild(text); box.appendChild(row); box.appendChild(policy); document.body.appendChild(box);
    // The banner is non-modal. Focus moves only when the visitor opens preferences.
    if (opener) accept.focus();
  }
  function init() {
    if (stored() === 'granted') loadAnalytics();
    else if (stored() !== 'denied') showPreferences();
    var footer = document.querySelector('footer') || document.body;
    var preferences = document.createElement('button'); preferences.type = 'button'; preferences.className = 'cookie-preferences'; preferences.textContent = 'Cookie preferences';
    preferences.addEventListener('click', function () { showPreferences(preferences); }); footer.appendChild(preferences);
    document.querySelectorAll('nav .nav-toggle').forEach(function (toggle) {
      var menu = toggle.closest('nav').querySelector('.nav-links');
      if (!menu) return;
      menu.id = menu.id || 'primary-nav'; toggle.setAttribute('aria-controls', menu.id);
      function close() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      toggle.addEventListener('click', function () { toggle.setAttribute('aria-expanded', String(menu.classList.toggle('open'))); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
      toggle.closest('nav').addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); toggle.focus(); } });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!link || stored() !== 'granted' || typeof window.gtag !== 'function') return;
    // Do not send email subjects, addresses, bodies or free-form enquiry data to analytics.
    window.gtag('event', 'generate_lead', { method: 'email', transport_type: 'beacon' });
  }, true);
})();
