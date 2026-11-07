// Enquiry form: posts to /api/capture/ (emails the lead to Alvento) and keeps
// the plain email address visible as a fallback. Markup:
//   <form class="lead-form" data-product="homepage enquiry"> ... </form>
// Fields read: name, email (required), website, message, and a hidden
// "fax" honeypot that real visitors never fill in.
(function () {
  function send(form) {
    var status = form.querySelector('.lead-form__status');
    var button = form.querySelector('button[type="submit"]');
    var data = new FormData(form);
    var email = String(data.get('email') || '').trim();
    if (!email) {
      status.textContent = 'Please add your email address so we can reply.';
      return;
    }
    var context = [
      'Name: ' + (data.get('name') || ''),
      'Website: ' + (data.get('website') || ''),
      'Page: ' + location.pathname,
      'Message: ' + (data.get('message') || ''),
    ].join('\n');
    button.disabled = true;
    status.textContent = 'Sending...';
    fetch('/api/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        product: form.getAttribute('data-product') || 'website enquiry',
        context: context,
        fax: data.get('fax') || '',
      }),
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        if (r.ok && r.body && r.body.ok) {
          form.reset();
          status.textContent = 'Thank you. We will reply by email, usually within one working day.';
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'generate_lead', { method: 'form', lead_subject: form.getAttribute('data-product') || '' });
          }
        } else {
          status.textContent = (r.body && r.body.error) || 'That did not go through. Please email hello@alvento.uk instead.';
        }
      })
      .catch(function () {
        status.textContent = 'That did not go through. Please email hello@alvento.uk instead.';
      })
      .then(function () { button.disabled = false; });
  }

  document.querySelectorAll('form.lead-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send(form);
    });
  });
})();
