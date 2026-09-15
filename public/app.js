const $ = (selector) => document.querySelector(selector);
const tokenKey = 'task-inator-token';
const tokenPanel = $('#token-panel');
const message = $('#message');

function token() { return localStorage.getItem(tokenKey); }
function setMessage(text = '') { message.textContent = text; }
function headers() { return { 'content-type': 'application/json', authorization: `Bearer ${token()}` }; }
function dateLabel(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''; }

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  if (!response.ok) throw new Error(response.status === 401 ? 'Your token was not accepted.' : `Request failed (${response.status}).`);
  return response.json();
}

async function loadFocus() {
  if (!token()) { $('#empty').classList.remove('hidden'); $('#focus').classList.add('hidden'); return; }
  try {
    setMessage();
    const focus = await request('/api/focus');
    $('#empty').classList.add('hidden'); $('#focus').classList.remove('hidden');
    const labels = { critical: 'Critical', today: 'Today', should_start: 'Should start', waiting: 'Waiting' };
    const groups = $('#groups'); groups.replaceChildren();
    for (const [key, tasks] of Object.entries(focus)) {
      if (!tasks.length) continue;
      const group = document.createElement('section'); group.className = 'group'; group.innerHTML = `<h2>${labels[key]}</h2>`;
      tasks.forEach((task) => group.append(taskElement(task)));
      groups.append(group);
    }
    if (!groups.childElementCount) groups.innerHTML = '<section class="panel"><p>Nothing needs attention right now.</p></section>';
  } catch (error) { setMessage(error.message); $('#empty').classList.remove('hidden'); }
}

function taskElement(task) {
  const item = $('#task-template').content.firstElementChild.cloneNode(true);
  item.querySelector('h3').textContent = task.title;
  item.querySelector('.meta').textContent = [task.dueAt && `Due ${dateLabel(task.dueAt)}`, task.status === 'active' && 'In progress'].filter(Boolean).join(' · ');
  item.querySelector('.start').onclick = () => act(`/api/tasks/${task.id}/start`);
  item.querySelector('.complete').onclick = () => act(`/api/tasks/${task.id}/complete`);
  item.querySelector('.snooze').onclick = () => act(`/api/tasks/${task.id}/snooze`, { until: 'tomorrow morning' });
  return item;
}

async function act(path, body) { try { await request(path, { method: 'POST', body: body && JSON.stringify(body) }); await loadFocus(); } catch (error) { setMessage(error.message); } }

$('#settings').onclick = () => tokenPanel.classList.toggle('hidden');
$('#save-token').onclick = () => { const value = $('#token').value.trim(); if (value) localStorage.setItem(tokenKey, value); tokenPanel.classList.add('hidden'); loadFocus(); };
$('#clear-token').onclick = () => { localStorage.removeItem(tokenKey); $('#token').value = ''; loadFocus(); };
$('#refresh').onclick = loadFocus;
$('#capture-form').onsubmit = async (event) => { event.preventDefault(); const title = $('#title').value.trim(); if (!title) return; try { await request('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }); $('#title').value = ''; await loadFocus(); } catch (error) { setMessage(error.message); } };
loadFocus();
