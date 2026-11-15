// Shared, dependency-free retrieval for the browser's honest excerpt fallback.
const stop = new Set('a an the is are was were can could would should i we my our it its this that what which how do does did to of in on for and or with me about please robot rules rule'.split(' '));
const groups = [
  ['weight','weigh','weighs','heavy','mass','kg'], ['battery','batteries','voltage','volt','volts','24'],
  ['size','dimensions','wide','width','height','tall','cube','expand'],
  ['spring','springs','preload','preloaded','pretensioned','launcher','launching','stored'],
  ['pressure','pneumatics','pneumatic','psi','air'], ['autonomous','auto','automatic'],
  ['climb','climbing','ascent','wall'], ['marksman','shoot','shooting','launch','launcher','bean'],
  ['deadline','due','report','submit','submission'], ['wireless','tether','control','link'],
  ['time','duration','seconds','minutes','long'], ['lift','dumbbell','dumbbells']
];
function words(text) { return text.toLowerCase().replace(/pre[- ](?=load|tension)/g,'pre').match(/[a-z0-9]+(?:[.-][0-9]+)*/g) || []; }
export function searchRules(chunks, question, previous = '', limit = 5) {
  const original = words(question).filter(w => !stop.has(w));
  const terms = new Map(original.map(w => [w, 3]));
  if (/\b(it|that|those|they|also|what about)\b/i.test(question)) {
    words(previous).filter(w => !stop.has(w)).forEach(w => { if (!terms.has(w)) terms.set(w, 1); });
  }
  for (const group of groups) if (group.some(w => terms.has(w))) {
    for (const w of group) if (!terms.has(w)) terms.set(w, 2);
  }
  if (!terms.size) return [];
  const ranked = chunks.map(chunk => {
    const tokens = new Set(words(chunk.text + ' ' + chunk.label));
    let score = 0;
    for (const [word, weight] of terms) if (tokens.has(word)) {
      const count = chunks.filter(c => words(c.text + ' ' + c.label).includes(word)).length;
      score += weight * Math.log(1 + chunks.length / (1 + count));
    }
    score /= Math.pow(Math.max(1, tokens.size / 45), 0.55);
    if (chunk.label.startsWith('Rule ')) score *= 1.35;
    return { ...chunk, score };
  }).filter(c => c.score >= 3).sort((a,b) => b.score - a.score);
  return ranked.slice(0, limit);
}
export function validCitations(answer, chunks) {
  if (typeof answer !== 'string') return null;
  const ids = [...new Set([...answer.matchAll(/\[(S\d+)\]/g)].map(m => m[1]))];
  if (!ids.length || ids.some(id => !chunks.some(c => c.id === id))) return null;
  return ids.map(id => chunks.find(c => c.id === id));
}
