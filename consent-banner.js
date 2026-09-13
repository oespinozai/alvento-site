(function () {
  var STORAGE_KEY = 'alvento_consent';

  function getStoredChoice() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredChoice(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* ignore */
    }
  }

  function updateConsent(granted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
      });
    }
  }

  function injectBanner() {
    var el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie preferences');
    el.style.cssText = [
      'position:fixed', 'left:16px', 'right:16px', 'bottom:16px', 'z-index:9999',
      'max-width:560px', 'margin:0 auto',
      'background:#141414', 'color:#e8e8e8', 'border:1px solid #2a2a2a',
      'border-radius:8px', 'padding:20px 24px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:0.9rem', 'line-height:1.5',
      'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    ].join(';');

    var text = document.createElement('p');
    text.style.cssText = 'margin:0 0 14px;color:#c8c8c8;';
    text.textContent = 'We use analytics cookies to understand how visitors use this site. You can accept or decline; declining does not affect anything else on the site.';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';

    function makeBtn(labelText, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = labelText;
      b.style.cssText = [
        'font-family:inherit', 'font-size:0.85rem', 'font-weight:600',
        'padding:10px 20px', 'border-radius:4px', 'cursor:pointer',
        primary ? 'background:#c4f042;color:#0a0a0a;border:none;' : 'background:transparent;color:#e8e8e8;border:1px solid #2a2a2a;',
      ].join(';');
      return b;
    }

    var acceptBtn = makeBtn('Accept analytics', true);
    var declineBtn = makeBtn('Decline', false);

    acceptBtn.addEventListener('click', function () {
      setStoredChoice('granted');
      updateConsent(true);
      el.remove();
    });
    declineBtn.addEventListener('click', function () {
      setStoredChoice('denied');
      updateConsent(false);
      el.remove();
    });

    btnRow.appendChild(acceptBtn);
    btnRow.appendChild(declineBtn);
    el.appendChild(text);
    el.appendChild(btnRow);
    document.body.appendChild(el);
  }

  function init() {
    var choice = getStoredChoice();
    if (choice === 'granted' || choice === 'denied') {
      // Consent default in <head> already reflects this; nothing more to do here.
      return;
    }
    if (document.body) {
      injectBanner();
    } else {
      document.addEventListener('DOMContentLoaded', injectBanner);
    }
  }

  init();
})();
