export const SCHEDULE_BOUNDARY_CLIENT_SCRIPT = `(function(){
  var m = document.getElementById('messages');
  if (!m || !m.dataset.scheduleBoundaries) return;
  var boundaries;
  try { boundaries = JSON.parse(m.dataset.scheduleBoundaries); } catch (e) { return; }
  if (!Array.isArray(boundaries) || boundaries.length === 0) return;
  var rendered = new Set();
  m.querySelectorAll('[data-boundary-key]').forEach(function(el){
    if (el.dataset.boundaryKey) rendered.add(el.dataset.boundaryKey);
  });
  var parseSec = function(raw){
    var match = /^\\d{4}-\\d{2}-\\d{2}[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?/.exec((raw || '').trim());
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + (match[3] ? Number(match[3]) : 0);
  };
  var nowJstSec = function(){
    var j = new Date(Date.now() + 9 * 3600000);
    return j.getUTCHours() * 3600 + j.getUTCMinutes() * 60 + j.getUTCSeconds();
  };
  var makeSpan = function(cls, txt, hidden){
    var el = document.createElement('span');
    if (cls) el.className = cls;
    if (hidden) el.setAttribute('aria-hidden', 'true');
    el.textContent = txt;
    return el;
  };
  var makeEl = function(b){
    var isStart = b.kind === 'start';
    var label = isStart ? '開始' : '終了';
    var li = document.createElement('li');
    li.className = 'schedule-boundary schedule-boundary--' + b.kind;
    li.dataset.boundaryKey = b.key;
    li.dataset.boundarySeconds = String(b.seconds);
    li.dataset.boundaryKind = b.kind;
    li.setAttribute('aria-label', b.time + ' ' + b.title + ' ' + label);
    var pill = makeSpan('schedule-boundary-pill', '', false);
    pill.append(
      makeSpan('', isStart ? '▶' : '■', true),
      makeSpan('schedule-boundary-time', b.time, false),
      makeSpan('schedule-boundary-title', b.title, false),
      makeSpan('schedule-boundary-label', label, false)
    );
    li.appendChild(pill);
    return li;
  };
  var syncing = false;
  var placeMessage = function(msgEl){
    var sec = parseSec(msgEl.dataset.createdAt);
    if (sec === null) return;
    syncing = true;
    try {
      var later = null;
      var existing = m.querySelectorAll('.schedule-boundary');
      for (var i = 0; i < existing.length; i++) {
        if (Number(existing[i].dataset.boundarySeconds) > sec) { later = existing[i]; break; }
      }
      if (later && later.compareDocumentPosition(msgEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
        m.insertBefore(msgEl, later);
      }
      for (var j = 0; j < boundaries.length; j++) {
        var b = boundaries[j];
        if (!rendered.has(b.key) && b.seconds <= sec) {
          m.insertBefore(makeEl(b), msgEl);
          rendered.add(b.key);
        }
      }
    } finally { syncing = false; }
  };
  var syncClock = function(){
    var nowSec = nowJstSec();
    var added = false;
    syncing = true;
    try {
      for (var i = 0; i < boundaries.length; i++) {
        var b = boundaries[i];
        if (!rendered.has(b.key) && b.seconds <= nowSec) {
          m.appendChild(makeEl(b));
          rendered.add(b.key);
          added = true;
        }
      }
    } finally { syncing = false; }
    if (added) m.scrollTop = m.scrollHeight;
  };
  new MutationObserver(function(mutations){
    if (syncing) return;
    mutations.forEach(function(mut){
      mut.addedNodes.forEach(function(node){
        if (node.nodeType === 1 && node.classList && node.classList.contains('msg-item')) {
          placeMessage(node);
        }
      });
    });
  }).observe(m, { childList: true });
  setInterval(syncClock, 5000);
})();`
