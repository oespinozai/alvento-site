(() => {
  'use strict';
  const key = 'alvento-arrears-session-v1';
  const status = document.getElementById('demo-status');
  const buttons = [...document.querySelectorAll('[data-action]')];
  let token = null;
  let current = null;
  try { token = sessionStorage.getItem(key); } catch { /* In-memory fallback. */ }
  const date = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value / 100);
  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function stageIcon(paid, finalStage) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    for (const [key, value] of Object.entries({ class: 'ledger-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
    const shapes = paid || finalStage
      ? [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: paid ? 'm8 12 3 3 5-6' : 'M12 7v6m0 3v1' }]]
      : [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ['path', { d: 'm3 6 9 7 9-7' }]];
    for (const [tag, attributes] of shapes) {
      const shape = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
      svg.append(shape);
    }
    return svg;
  }
  async function request(route, data) {
    const response = await fetch(`/api/arrears?route=${route}`, {
      method: route === 'state' ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: route === 'state' ? undefined : JSON.stringify(data || {}),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error || 'The demo could not load. Please try again.'); error.status = response.status; throw error; }
    return result;
  }
  function render(state) {
    current = state;
    document.getElementById('ledger-date').textContent = date(state.date);
    const rows = state.invoices.map(invoice => {
      const paid = invoice.status === 'paid';
      const row = el('tr'); row.dataset.status = invoice.status; row.dataset.stage = invoice.stage;
      const id = el('td');
      const avatar = el('span', invoice.client.split(' ').map(word => word[0]).join('').slice(0, 2), 'client-avatar');
      avatar.setAttribute('aria-hidden', 'true');
      id.append(avatar, el('span', `#${invoice.id}`, 'invoice-id'), el('small', invoice.client));
      const days = el('td');
      const indicator = el('div', undefined, 'overdue-indicator');
      const track = el('span', undefined, 'overdue-track'); track.setAttribute('aria-hidden', 'true');
      const progress = el('span'); progress.style.setProperty('--progress', `${Math.min(100, invoice.days / 42 * 100)}%`); track.append(progress);
      indicator.append(el('span', invoice.days, 'day-count'), track); days.append(indicator);
      const stage = el('td'); const stageContent = el('div', undefined, 'stage-content');
      const stageText = el('div', paid ? 'Complete' : invoice.stage ? `Day ${invoice.stage}` : 'Waiting');
      stageText.append(el('small', paid ? 'No further reminders' : invoice.stage_label));
      stageContent.append(stageIcon(paid, invoice.stage === 42), stageText); stage.append(stageContent);
      const stateCell = el('td'); stateCell.append(el('span', paid ? 'Paid' : 'Overdue', `status-pill ${paid ? 'paid' : invoice.days >= 42 ? 'late' : ''}`));
      row.append(id, el('td', money(invoice.amount), 'amount'), el('td', date(invoice.due)), days, stage, stateCell);
      return row;
    });
    document.getElementById('ledger-rows').replaceChildren(...rows);
    document.getElementById('email-count').textContent = `${state.outbox.length} email${state.outbox.length === 1 ? '' : 's'}`;
    document.getElementById('activity-count').textContent = `${state.activity.length} shown`;
    const emails = state.outbox.map((email, index) => {
      const details = el('details');
      if (index === 0) details.open = true;
      const summary = el('summary');
      const badge = el('span', undefined, 'email-stage'); badge.dataset.stage = email.stage;
      badge.append(el('small', 'Day'), document.createTextNode(email.stage));
      const heading = el('span', `Invoice #${email.invoice}`, 'email-heading');
      heading.append(el('small', email.subject.replace(/^Invoice #[^:]+:\s*/, '')));
      summary.append(badge, heading);
      const content = el('div', undefined, 'email-content');
      const meta = el('div', undefined, 'email-meta');
      meta.append(el('span', 'Captured only / not sent'), el('span', date(email.captured_on)));
      content.append(meta, el('pre', email.body));
      details.append(summary, content);
      return details;
    });
    document.getElementById('outbox').replaceChildren(...(emails.length ? emails : [el('p', 'Run the reminder cycle to capture the first emails.', 'demo-empty')]));
    document.getElementById('activity').replaceChildren(...state.activity.map(event => {
      const item = el('li'); const time = el('time', date(event.at)); time.dateTime = event.at;
      const card = el('div', undefined, 'activity-card');
      const title = event.message.includes('reminder captured') ? 'Reminder captured'
        : event.message.includes('payment matched') ? 'Payment matched'
        : event.message.includes('clock advanced') ? 'Demo date advanced'
        : event.message.includes('held for review') ? 'Review needed'
        : event.message.includes('ledger opened') ? 'Mock ledger opened' : 'Cadence checked';
      card.append(time, el('strong', title), el('span', event.message));
      item.append(card); return item;
    }));
    const paid = state.invoices.find(i => i.id === '1200').status === 'paid';
    document.querySelector('[data-action="pay"]').textContent = paid ? 'Repeat payment event' : 'Simulate payment for #1200';
  }
  async function start() {
    const state = await request('session');
    token = state.token;
    try { sessionStorage.setItem(key, token); } catch { /* In-memory fallback. */ }
    return state;
  }
  async function perform(action) {
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = 'Updating your mock ledger...';
    try {
      let state;
      if (action === 'reset') state = await start();
      else {
        if (!token) await start();
        state = await request('action', { action });
      }
      render(state);
      status.textContent = state.message || 'Fresh mock ledger ready. Run the reminder cycle to begin.';
    } catch (error) {
      if (error.status === 401) { token = null; try { sessionStorage.removeItem(key); } catch {} }
      status.textContent = error.status === 401 ? 'Your session expired. Click Reset demo to start again.' : error.message;
    } finally { buttons.forEach(button => { button.disabled = false; }); }
  }
  buttons.forEach(button => button.addEventListener('click', () => perform(button.dataset.action)));
  (async () => {
    try {
      let state;
      if (token) {
        try { state = await request('state'); }
        catch (error) { if (error.status !== 401) throw error; token = null; state = await start(); }
      } else state = await start();
      render(state);
      status.textContent = state.outbox.length ? 'Mock ledger ready. Your saved emails and activity are shown below.' : 'Mock ledger ready. Run the reminder cycle to begin.';
    } catch {
      status.textContent = 'Showing a static mock snapshot. Click Reset demo to retry the working demo.';
    } finally { buttons.forEach(button => { button.disabled = false; }); }
  })();
})();
