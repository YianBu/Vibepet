
(function () {
  function byId(id) { return document.getElementById(id); }
  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1000000) { return (n / 1000000).toFixed(1) + 'M'; }
    if (n >= 1000) { return Math.round(n / 1000) + 'K'; }
    return String(n);
  }
  function part(label, w) {
    if (!w) { return ''; }
    var s = label + ' ' + w.percent + '%';
    if (w.status === 'rate-limited' || w.percent >= 100) { s += '限流'; }
    return s;
  }
  var ROW = 'cursor:default;padding-top:3px;padding-bottom:3px';
  window.__ocxRender = function (d) {
    if (!d) { return; }
    var bal = byId('ocx-bal');
    if (bal) { bal.textContent = (d.currency || 'CNY') + ' ' + (d.balance === null || d.balance === undefined ? '-' : d.balance); }
    var go = byId('ocx-go');
    if (go) {
      var parts = [part('5h', d.goRolling), part('周', d.goWeekly), part('月', d.goMonthly)].filter(function (s) { return s; });
      go.textContent = parts.join(' · ') || '-';
      go.title = 'rolling=' + JSON.stringify(d.goRolling) + ' weekly=' + JSON.stringify(d.goWeekly) + ' monthly=' + JSON.stringify(d.goMonthly);
    }
    var td = byId('ocx-today');
    if (td) { td.textContent = fmt(d.total) + ' / ' + d.requests + ' 次'; }
    var up = byId('ocx-upd');
    if (up) { up.textContent = d.updated || ''; }
    var pv = byId('ocx-prov');
    if (pv) { pv.textContent = (d.providers || []).map(function (p) { return p.provider + ' ' + p.n + '次 ' + fmt(p.total); }).join(' · '); }
  };
  function build() {
    var card = document.querySelector('.pop-card');
    if (!card) { return false; }
    var existing = byId('ocx-block');
    if (existing) {
      if (byId('ocx-go')) { return true; }
      existing.parentNode.removeChild(existing);
    }
    var block = document.createElement('div');
    block.id = 'ocx-block';
    block.innerHTML =
      '<div class="pop-divider"></div>' +
      '<div class="pop-sec" style="padding-bottom:2px"><span class="pop-sec-label">OPENCODEX</span><span class="cap" id="ocx-upd"></span></div>' +
      '<div class="pop-row" style="' + ROW + '"><span class="pop-label">DeepSeek</span><b id="ocx-bal">-</b></div>' +
      '<div class="pop-row" style="' + ROW + '"><span class="pop-label" title="5 小时滚动窗口 / 周 / 月">opencode-go</span><b id="ocx-go" style="font-size:12px">-</b></div>' +
      '<div class="pop-row" style="' + ROW + '"><span class="pop-label">今日消耗</span><b id="ocx-today">-</b></div>' +
      '<div class="cap" id="ocx-prov" style="padding:0 14px 8px;line-height:1.4"></div>';
    var foot = card.querySelector('.pop-foot');
    if (foot) {
      var prev = foot.previousElementSibling;
      if (prev && prev.classList.contains('pop-divider')) { card.insertBefore(block, prev); }
      else { card.insertBefore(block, foot); }
    } else {
      card.appendChild(block);
    }
    return true;
  }
  if (!build()) {
    var mo = new MutationObserver(function () { if (build()) { mo.disconnect(); } });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', build);
  }
  var guard = setInterval(function () { if (!byId('ocx-block')) { build(); } else { clearInterval(guard); } }, 1500);
})();

