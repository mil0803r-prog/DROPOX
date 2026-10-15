'use strict';
/* DROPOX — en celular el menú lateral se desliza desde la izquierda (botón ☰ o arrastrando desde el borde). */
(() => {
  const tabs = document.getElementById('tabs'), head = document.querySelector('.brand');
  if (!tabs || !head) return;
  const mq = matchMedia('(max-width:699px)');

  tabs.insertAdjacentHTML('afterbegin', '<div class="dbrand"><img src="icon.svg" alt=""><div><b>DROPOX</b><small>ECOMMERCE &amp; FINANZAS</small></div></div>');
  const ov = document.createElement('div'); ov.className = 'menu-ov'; document.body.appendChild(ov);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'ic menu-btn'; btn.setAttribute('aria-label', 'Abrir menú'); btn.setAttribute('aria-controls', 'tabs'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  head.insertBefore(btn, head.firstChild);

  const abierto = () => tabs.classList.contains('open');
  function poner(on) {
    on = on && mq.matches;
    tabs.classList.toggle('open', on); ov.classList.toggle('show', on);
    btn.setAttribute('aria-expanded', on); btn.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
  }
  btn.onclick = () => poner(!abierto());
  ov.onclick = () => poner(false);
  tabs.addEventListener('click', e => { if (e.target.closest('a')) poner(false); });
  addEventListener('hashchange', () => poner(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') poner(false); });
  mq.addEventListener('change', () => poner(false));

  // arrastrar: desde el borde izquierdo abre, hacia la izquierda cierra
  let x0 = null, y0 = 0, borde = false;
  addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; borde = x0 < 24; }, { passive: true });
  addEventListener('touchmove', e => {
    if (x0 === null || !mq.matches) return;
    const t = e.touches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    if (dy > Math.abs(dx)) return;
    if (!abierto() && borde && dx > 50) { poner(true); x0 = null; }
    else if (abierto() && dx < -50) { poner(false); x0 = null; }
  }, { passive: true });
  addEventListener('touchend', () => { x0 = null; }, { passive: true });
})();
