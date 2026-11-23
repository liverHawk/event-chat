export const SCHEDULE_BOUNDARY_CLIENT_SCRIPT = `(function(){
  var m = document.getElementById('messages');
  if (!m || !m.dataset.scheduleBoundaries) return;
  var boundaries;
  try { boundaries = JSON.parse(m.dataset.scheduleBoundaries); } catch (e) { return; }
  if (!Array.isArray(boundaries) || boundaries.length === 0) return;
  var scheduleDate = m.dataset.scheduleDate || '';
  var rendered = new Set();
  m.querySelectorAll('[data-boundary-key]').forEach(function(el){
    if (el.dataset.boundaryKey) rendered.add(el.dataset.boundaryKey);
  });
  var parseTs = function(raw){
    var match = /^(\\d{4}-\\d{2}-\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?/.exec((raw || '').trim());
    if (!match) return null;
    return {
      date: match[1],
      seconds: Number(match[2]) * 3600 + Number(match[3]) * 60 + (match[4] ? Number(match[4]) : 0)
    };
  };
  var nowJst = function(){
    var j = new Date(Date.now() + 9 * 3600000);
    return {
      date: j.toISOString().slice(0, 10),
      seconds: j.getUTCHours() * 3600 + j.getUTCMinutes() * 60 + j.getUTCSeconds()
    };
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
    var kind = isStart ? 'start' : 'end';
    var label = isStart ? '開始' : '終了';
    var li = document.createElement('li');
    li.className = 'schedule-boundary schedule-boundary--' + kind;
    li.dataset.boundaryKey = b.key;
    li.dataset.boundarySeconds = String(b.seconds);
    li.dataset.boundaryKind = kind;
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
  var timer = null;
  var stopIfDone = function(){
    if (timer !== null && rendered.size >= boundaries.length) {
      clearInterval(timer);
      timer = null;
    }
  };
  var observer;
  var placeMessage = function(msgEl){
    var ts = parseTs(msgEl.dataset.createdAt);
    if (!ts || (scheduleDate && ts.date < scheduleDate)) return;
    var isAfterDate = Boolean(scheduleDate && ts.date > scheduleDate);
    try {
      if (!isAfterDate) {
        var later = null;
        var existing = m.querySelectorAll('.schedule-boundary');
        for (var i = 0; i < existing.length; i++) {
          if (Number(existing[i].dataset.boundarySeconds) > ts.seconds) { later = existing[i]; break; }
        }
        if (later && (later.compareDocumentPosition(msgEl) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          m.insertBefore(msgEl, later);
        }
      }
      var limit = isAfterDate ? Infinity : ts.seconds;
      for (var j = 0; j < boundaries.length; j++) {
        var b = boundaries[j];
        if (!rendered.has(b.key) && b.seconds <= limit) {
          m.insertBefore(makeEl(b), msgEl);
          rendered.add(b.key);
        }
      }
      stopIfDone();
    } finally {
      if (observer) observer.takeRecords();
    }
  };
  var syncClock = function(){
    var now = nowJst();
    if (scheduleDate && now.date !== scheduleDate) return;
    try {
      for (var i = 0; i < boundaries.length; i++) {
        var b = boundaries[i];
        if (!rendered.has(b.key) && b.seconds <= now.seconds) {
          m.appendChild(makeEl(b));
          rendered.add(b.key);
        }
      }
      stopIfDone();
    } finally {
      if (observer) observer.takeRecords();
    }
  };
  observer = new MutationObserver(function(mutations){
    mutations.forEach(function(mut){
      mut.addedNodes.forEach(function(node){
        if (node.nodeType === 1 && node.classList && node.classList.contains('msg-item')) {
          placeMessage(node);
        }
      });
    });
  });
  observer.observe(m, { childList: true });
  if (rendered.size < boundaries.length) timer = setInterval(syncClock, 5000);
})();`
