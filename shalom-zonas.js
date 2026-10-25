'use strict';
/* DROPOX — Shalom · Públicos por zona: ubicaciones cerca de las agencias Shalom, agrupadas en 5 zonas y listas para segmentar anuncios. */
(() => {
  const ZONAS = ['Lima y Callao', 'Norte', 'Sur', 'Centro', 'Oriente'];
  const D = () => window.SHALOM_ZONAS || { agencias: {}, zonas: {} };
  const radio = () => Math.min(50, Math.max(2, num(S.config.shalomRadio) || 10));
  const json = z => JSON.stringify({ geo_locations: { custom_locations: D().zonas[z].map(([la, lo]) => ({ latitude: la, longitude: lo, radius: radio(), distance_unit: 'kilometer' })) } });
  const lineas = z => D().zonas[z].map(([la, lo]) => la + ', ' + lo).join('\n');
  const csv = z => 'latitud,longitud,radio_km,agencias_cercanas\n' + D().zonas[z].map(([la, lo, n]) => [la, lo, radio(), n].join(',')).join('\n');
  const copiar = (t, m) => (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast(m), () => toast('No se pudo copiar')) : toast('No se pudo copiar'));
  const bajar = (nombre, texto) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv' })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  function vista(el) {
    const d = D(), tot = Object.values(d.agencias).reduce((s, n) => s + n, 0), pts = Object.values(d.zonas).reduce((s, L) => s + L.length, 0);
    const tile = (l, v) => `<div class="t"><small>${l}</small><b>${v}</b></div>`;
    el.innerHTML = `${secH('shalom', 'Públicos por zona', 'Ubicaciones cerca de las agencias Shalom, guardadas para tus anuncios')}
    <div class="tiles">${tile('Agencias', tot)}${tile('Ubicaciones', pts)}${tile('Zonas', ZONAS.length)}${tile('Radio', radio() + ' km')}</div>
    <div class="card"><h3>Radio alrededor de cada agencia</h3><p class="sub">Meta acepta de 1 a 50 km por punto. Las agencias a menos de 5 km una de otra se juntan en un solo punto. Para cada punto individual con radio de 1 km usa la sección Agencias Shalom.</p>
      <div class="row"><div class="field"><label>Radio (km)</label><input id="sz-r" type="number" min="2" max="50" step="1" inputmode="numeric" value="${radio()}"></div></div></div>
    ${ZONAS.filter(z => d.zonas[z]).map(z => `<div class="card"><div class="it-h"><b>${esc(z)}</b><span class="tag">${d.zonas[z].length} ubicaciones</span></div>
      <div class="it-s">${d.agencias[z] || 0} agencias · radio ${radio()} km · un conjunto de anuncios por zona</div>
      <div class="it-a" style="margin:8px 0 0"><button class="btn btn-sm btn-pri" data-j="${esc(z)}">Copiar segmentación (JSON)</button><button class="btn btn-sm" data-l="${esc(z)}">Copiar lat, long</button><button class="btn btn-sm" data-c="${esc(z)}">Descargar CSV</button></div></div>`).join('')}
    <p class="note">JSON: para el campo de segmentación al crear el conjunto de anuncios. «Copiar lat, long»: una ubicación por línea, para «Agregar ubicaciones en lote» en Meta (después eliges el radio).</p>`;
    $('#sz-r').onchange = e => { S.config.shalomRadio = Math.min(50, Math.max(2, num(e.target.value) || 10)); Store.save(); render(); };
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => copiar(json(b.dataset.j), 'Segmentación copiada'));
    el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => copiar(lineas(b.dataset.l), 'Ubicaciones copiadas'));
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => bajar('shalom-' + b.dataset.c.toLowerCase().replace(/\W+/g, '-') + '.csv', csv(b.dataset.c)));
  }
  window.ShalomZonas = { vista };
  if ((location.hash || '').slice(1) === 'shalomzonas') render();
})();
