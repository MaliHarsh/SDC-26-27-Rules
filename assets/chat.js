import { searchRules, validCitations } from './rules-search.js';
const WORKER_URL = 'https://sdc-rules-bot.harshvmali26.workers.dev';
const cb = document.getElementById('cb'), cp = document.getElementById('cp');
const cm = document.getElementById('cm'), ci = document.getElementById('ci');
const form = document.getElementById('cf'), send = form.querySelector('button');
let history = [], busy = false, rulesPromise;
function loadRules() {
  return rulesPromise ||= fetch(new URL('./rules.json', import.meta.url)).then(r => {
    if (!r.ok) throw new Error('rules_unavailable');
    return r.json();
  }).catch(error => { rulesPromise = null; throw error; });
}
function add(text, role) {
  const div = document.createElement('div'); div.className = 'm ' + role;
  div.textContent = text; cm.append(div); cm.scrollTop = cm.scrollHeight; return div;
}
function render(node, answer, citations, pdf) {
  node.replaceChildren();
  const refs = new Map(citations.map((c, i) => [c.id, i + 1]));
  for (const part of answer.split(/(\[S\d+\])/g)) {
    const id = part.slice(1,-1);
    if (!refs.has(id)) { node.append(document.createTextNode(part)); continue; }
    const c = citations.find(c => c.id === id), sup = document.createElement('sup'), a = document.createElement('a');
    a.textContent = `[${refs.get(id)}]`; a.href = `${pdf}#page=${c.page}`;
    a.target = '_blank'; a.rel = 'noopener'; a.title = `${c.label}, PDF page ${c.page}`;
    sup.append(a); node.append(sup);
  }
  if (citations.length) {
    const list = document.createElement('ol'); list.className = 'citations';
    for (const c of citations) {
      const li = document.createElement('li'), a = document.createElement('a');
      a.textContent = `${c.label} — PDF p. ${c.page}${c.endPage ? '–' + c.endPage : ''}`; a.href = `${pdf}#page=${c.page}`;
      a.target = '_blank'; a.rel = 'noopener';
      const details = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = 'View rulebook excerpt';
      const quote = document.createElement('blockquote'); quote.textContent = c.text;
      details.append(summary, quote); li.append(a, details); list.append(li);
    }
    node.append(list);
  }
  cm.scrollTop = cm.scrollHeight;
}
cb.onclick = () => {
  cp.hidden = !cp.hidden; cb.setAttribute('aria-expanded', String(!cp.hidden));
  if (!cp.hidden) {
    if (!cm.children.length) add('Ask me about the PODIUM rules. Answers include references to the official PDF. If AI is unavailable, I’ll show matching rulebook excerpts.', 'a');
    ci.focus();
  }
};
cp.addEventListener('keydown', e => { if(e.key === 'Escape') { cp.hidden=true; cb.setAttribute('aria-expanded','false'); cb.focus(); } });
form.onsubmit = async e => {
  e.preventDefault(); const question = ci.value.trim(); if (!question || busy) return;
  busy = true; send.disabled = true; ci.disabled = true; ci.value = '';
  add(question, 'u'); const waiting = add('Reading the rulebook…', 'a');
  cm.setAttribute('aria-busy','true');
  const previous = history.filter(m => m.role === 'user').at(-1)?.content || '';
  const messages = [...history.slice(-6), {role:'user',content:question}];
  let rules;
  try {
    rules = await loadRules();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch(WORKER_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages}),signal:controller.signal});
    } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error('ai_unavailable');
    const data = await response.json();
    // Resolve IDs against the local official PDF, never model-supplied URLs or labels.
    const citations = validCitations(data.answer, rules.chunks);
    if (data.sourceVersion !== rules.sha256 || !citations) throw new Error('unverified_sources');
    render(waiting, data.answer, citations, rules.pdf);
    history = [...messages, {role:'assistant',content:data.answer}].slice(-6);
  } catch (error) {
    if (!rules) {
      waiting.textContent = 'The rulebook could not load. Please try again or open the official PDF using the link above.';
    } else {
      const matches = searchRules(rules.chunks, question, previous);
      const intro = 'AI is temporarily unavailable. These are matching rulebook excerpts, not an interpreted answer:\n\n';
      const answer = matches.length ? intro + matches.map(c => `“${c.text}” [${c.id}]`).join('\n\n') : 'AI is temporarily unavailable, and I couldn’t find a clear rulebook match. Try naming the discipline or topic, or check the official PDF / ASME Q&A.';
      render(waiting, answer, matches, rules.pdf);
      // Keep the user's topic for follow-ups, without treating search excerpts as AI answers.
      history = [...messages, {role:'assistant', content:'AI unavailable; matching excerpts were shown. No interpretation was provided.'}].slice(-6);
    }
  } finally {
    busy = false; send.disabled = false; ci.disabled = false;
    cm.setAttribute('aria-busy','false'); if (!cp.hidden) ci.focus();
  }
};
