'use strict';
/* DROPOX — Radar diario (kit de Kevin Galeano) y el radar de hoy para Perú.
   Los números de operación se editan aquí y el margen se recalcula al instante. */
(() => {
  // Corrida del 22-oct-2026 · Perú · Dropi · DropKiller + biblioteca de anuncios
  const HOY = {
    fecha: '2026-10-22',
    embudo: { A: 0, B: 3, ampliado: 18, sobre200: 1 },
    // nombre, costo, sugerido, v7, v30, stock, proveedor, id de Dropi, categoría, riesgo ('' | 'rojo' | 'amarillo')
    filas: [
      ['Gld unisex 2 und', 37, 89, 344, 973, 981, 'sin dato (40 productos)', 6434, 'Tecnología', ''],
      ['Casaca protección UV - dama', 42, 79.9, 25, 25, 53, 'evermont', 6874, 'Ropa', ''],
      ['Beast Bites creatina', 20, 20, 20, 47, 955, 'nibresma', 9707, 'Suplemento', 'amarillo'],
      ['Jimerito bee honey (elimina las cataratas)', 25, 25, 20, 60, 191, 'importaciones tukuy rikuy', 8580, 'Salud', 'amarillo'],
      ['Combo prostate health & nitric oxide', 30, 30, 19, 60, 380, 'nibresma', 8141, 'Salud', 'amarillo'],
      ['Kit de grabación de video con trípode', 29, 89, 15, 15, 485, 'roldin', 8820, 'Tecnología', ''],
      ['Jaysuing sellador impermeabilizante', 18, 89.9, 14, 16, 88, 'daniel eduardo', 6262, 'Limpieza / hogar', ''],
      ['Ahorrador de energía', 31, 99, 13, 13, 86, 'sin dato', 8668, 'Hogar', ''],
      ['Linterna martillo 6 en 1 + regalo lentes', 12.99, 80, 12, 18, 218, 'sin dato', 5916, 'Herramientas', ''],
      ['Rodillo quita pelusa', 7, 19, 10, 35, 162, 'evermont', 174, 'Hogar', ''],
      ['Elhoe hair', 11, 11, 10, 10, 89, 'nibresma', 8140, 'Suplemento', 'amarillo'],
      ['Masajeador de pies eléctrico', 14, 59, 10, 12, 99, 'shoppedi2', 6464, 'Salud / belleza', ''],
      ['Taurine - Kittysupps', 30, 30, 10, 10, 1190, 'nibresma', 9735, 'Mascotas', 'amarillo'],
      ['Llave y dado universal', 19.5, 70, 9, 54, 254, 'baratisimo', 1841, 'Herramientas', ''],
      ['Removedor óxido Schubert 500ml', 18.9, 61.9, 9, 9, 91, 'aswan importaciones', 9251, 'Limpieza', 'rojo'],
      ['Tobillera de compresión con bandas elásticas', 20, 89, 8, 9, 491, 'roldin', 8834, 'Deportes', ''],
      ['Drenaje linfático Aurelys', 18, 18, 8, 179, 287, 'nibresma', 9403, 'Belleza', 'amarillo'],
      ['Oil of oregano', 30, 30, 7, 7, 141, 'nibresma', 8134, 'Suplemento', 'amarillo'],
      ['Pasta dental con hidroxiapatita', 27, 129, 7, 8, 92, 'sin dato', 8263, 'Salud', 'amarillo'],
      ['Bio Prost Premium (reg. san. DIGESA)', 37, 129, 6, 6, 1994, 'olimpo labs', 9044, 'Salud', 'amarillo'],
      ['Magnesio complex', 18, 18, 5, 17, 445, 'nibresma', 8154, 'Suplemento', 'amarillo'],
      ['Sombrilla para auto', 26.9, 79.9, 5, 5, 95, 'aswan importaciones', 9314, 'Automóviles', ''],
    ],
    finalistas: [
      {
        n: 'Kit de grabación de video con trípode', punt: [2, 3, 3, 2, 3], dropi: 8820,
        tiendas: 6, anuncios: 'Dudu Store lleva 74 días con el mismo anuncio activo (trípode multifuncional); Store Saavil, IRONK, Konford y Safex tienen anuncios activos; Lemelson (barra LED) también.',
        precios: 'Store Saavil lo vende a S/ 79 con envío gratis y pago contra entrega; Dudu Store arma packs de S/ 199 a S/ 249 (trípode + luz + micrófono).',
        landings: [['Store Saavil', 'https://storesaavil.myshopify.com/products/kit-profesional-todo-en-1'], ['Dudu Store', 'https://dudustore.com.pe/products/tripode-multifuncional-2-0'], ['IRONK', 'https://ironkperu.com/products/kit-mini-dj-microfono-condensador-dorado'], ['Konford', 'https://konfordtienda.com/products/kit-completo-f009-mic-condensador'], ['Safex Perú', 'https://www.safexperu.com/products/panel-para-sonido-profesional']],
        usados: ['«La gente compra lo que se ve profesional» (mala luz y audio)', 'Setup completo en un solo pack (trípode + luz + micrófono)', 'Clientes felices (+8257) como prueba social', 'Contenido de cocina y recetas', 'Fotos de viaje con trípode'],
        nuevos: [
          ['Vendedores de Instagram y TikTok Shop que graban sus propios productos', '«Tus productos se venden más cuando se ven bien: graba tu catálogo en 10 minutos»'],
          ['Docentes y profesores que dan clases virtuales', '«Tu clase grabada se escucha y se ve profesional, sin contratar a nadie»'],
          ['Emprendedores que hacen lives de venta', '«Haz tu live de ventas con luz y audio de estudio por menos de S/ 100»'],
          ['Músicos y cantantes que suben covers', '«Graba tu cover con el audio que merece, sin ir a un estudio»'],
          ['Padres que quieren grabar a sus hijos o eventos familiares', '«Cumpleaños, graduaciones y fiestas: grábalos estables y con buena luz»'],
        ],
      },
      {
        n: 'Jaysuing sellador impermeabilizante', punt: [3, 1, 3, 2, 3], dropi: 6262,
        tiendas: 10, anuncios: 'Unas 10 tiendas distintas anunciaron selladores o cintas contra goteras en Perú en los últimos meses; hoy siguen activas unas 4 (Innova WORLD con 23 días, Flajob Import, Paga en tu casa Chile y BullGuard Perú). Todoflash Perú anunció este mismo Jaysuing en septiembre y lo paró.',
        precios: 'Innova WORLD ofrece PROMO 3x2 con envío gratis; Super Ofertas Sv llegó a 81 días con un anuncio de 50% OFF + envío gratis; BullGuard incluye guantes + espátula.',
        landings: [['Innova WORLD', 'https://somos-innova.com/products/butilflex-360'], ['Flajob Import', 'https://www.flajobimport.store/products/cinta-impermeable-multifuncional-%C2%AE'], ['Todoflash Perú (mismo Jaysuing)', 'https://todoflashperu.online/products/jaysuing-el-impermeabilizante-que-protege-tu-hogar'], ['BullGuard Perú', 'https://estilochicas.com/products/kitselladorantigoteras-f3-img']],
        usados: ['Goteras y humedad cada vez que llueve', 'Sella en minutos sin obras ni maestro', 'Promo 3x2 y envío gratis', '+9.567 / +99433 compras como prueba social', 'Aplicación fácil con brocha o espátula'],
        nuevos: [
          ['Dueños de tienda o local pequeño', '«Una gotera te cuesta clientes: séllala hoy y abre mañana»'],
          ['Propietarios que alquilan cuartos', '«Evita el reclamo del inquilino: arregla la filtración en una tarde»'],
          ['Dueños de camionetas, combis y autos', '«Sella el techo o la ventana de tu vehículo antes de que entre el agua»'],
          ['Quienes viven en zonas de lluvia o selva', '«Prepárate para la temporada de lluvias antes de que llegue»'],
          ['Quienes alquilan y no pueden hacer obras', '«Repara sin romper paredes ni pedir permiso al dueño»'],
        ],
      },
      {
        n: 'Linterna martillo 6 en 1 + regalo lentes', punt: [2, 1, 3, 2, 3], dropi: 5916,
        tiendas: 1, anuncios: 'Solo Prisma Plaza anunció este mismo producto (agosto, 2 días activos) y hoy no tiene anuncios activos. Hay linternas parecidas (solar 5 en 1, mini llavero) pero no es el mismo producto. Cuidado: puede que lo probaron y no funcionó, o que quede el espacio libre.',
        precios: 'Prisma Plaza ofrecía 3 unidades por S/ 149.',
        landings: [['Prisma Plaza', 'https://prisma-plaza.com/products/linterna-multifuncional-6-in-1']],
        usados: ['Plan de prevención para apagones y emergencias', 'Mochila de emergencia', 'Oferta de 3 unidades'],
        nuevos: [
          ['Conductores de taxi y mototaxi', '«Rompe el vidrio, corta el cinturón y ten luz: la herramienta que ojalá no uses»'],
          ['Campistas y quienes viajan a la selva y sierra', '«Linterna, martillo y más en una sola pieza para tu mochila»'],
          ['Hijos que regalan a sus padres', '«El regalo útil para papá: herramienta de emergencia para el auto y la casa»'],
          ['Mecánicos y técnicos', '«Una herramienta de bolsillo con luz para trabajos en lugares oscuros»'],
          ['Familias de zonas con cortes de luz', '«Cuando se va la luz, esta linterna ya está en tu cajón»'],
        ],
      },
    ],
    notas: [
      'El producto con más ventas es «Gld unisex 2 und» (344 en 7 días, 973 en 30). Por sus anuncios son unas gafas antirreflectantes o lentes inteligentes; tiene 3 reabastecimientos y su proveedor aparece sin nombre.',
      'No pasé por anuncios los demás productos de la tabla: solo los tres finalistas con margen holgado y señal de demanda. Los de salud y suplementos quedan en amarillo (registro sanitario) y Schubert en rojo (posible marca).',
    ],
  };

  const CFG0 = { entrega: 75, flete: 12, devolucion: 8, comision: 4, cpa: 10, umbral: 8 };
  const cfg = () => Object.assign({}, CFG0, (S.config && S.config.radar) || {});
  const util = (pvp, c, g) => (g.entrega / 100) * (pvp - c - g.flete - (g.comision / 100) * pvp) - (1 - g.entrega / 100) * g.devolucion - g.cpa;
  function evaluar(f, g) {
    const [n, c, s, v7, v30, st, pr, id, cat, rk] = f;
    let pvp = s, est = false;
    if (s <= c * 1.15) { pvp = Math.round(2.5 * c); est = true; } // precio sugerido sin margen o basura: se estima 2,5x el costo
    let u = util(pvp, c, g), v;
    if (u > g.umbral) v = est ? 'REPRECIABLE' : 'VIABLE';
    else { const p2 = Math.round(2.5 * c), u2 = util(p2, c, g); if (u2 > g.umbral) { v = 'REPRECIABLE'; pvp = p2; est = true; u = u2; } else v = 'DESCARTADO'; }
    return { n, c, s, pvp, est, u, v, v7, v30, st, pr, id, cat, rk };
  }
  const cls = v => (v === 'VIABLE' ? 'rv-ok' : v === 'REPRECIABLE' ? 'rv-mid' : 'rv-no');
  const KIT = () => window.RADAR_KIT || { antes: [], prompt: '', despues: [] };

  function kitHtml(lineas) {
    return lineas.map(l => {
      const m = /^PARTE (\d+)(.*)$/.exec(l);
      if (m) return `<h2 class="rk-h">PARTE ${esc(m[1])} · ${esc(m[2])}</h2>`;
      if (/^\d{1,3}$/.test(l)) return `<div class="rk-n">${esc(l)}</div>`;
      if (/^(Obligatorio|Recomendado)/.test(l)) return `<span class="tag">${esc(l)}</span>`;
      return `<p class="rk-p">${esc(l)}</p>`;
    }).join('');
  }

  function vista(el) {
    const g = cfg(), K = KIT();
    const filas = HOY.filas.map(f => evaluar(f, g)).sort((a, b) => b.v7 - a.v7);
    const cuenta = v => filas.filter(x => x.v === v).length;
    const camp = (k, l, suf) => `<div class="field"><label>${l}</label><input data-rc="${k}" type="number" step="any" min="0" inputmode="decimal" value="${g[k]}"></div>`;
    const fin = HOY.finalistas.map(f => {
      const r = filas.find(x => x.n === f.n), tot = f.punt.reduce((a, b) => a + b, 0);
      const crit = ['Resuelve una necesidad', 'Sube el estatus o cambia la emoción', 'Funcionalidad clara', 'Admite ángulos nuevos', 'Permite oferta ganadora'];
      return `<div class="card rf">
        <div class="it-h"><b>${esc(f.n)}</b><b>${tot}/15</b></div>
        <div class="it-s"><span class="rv ${cls(r.v)}">${r.v}</span> · utilidad ${fmt(r.u)} por pedido generado a ${fmt(r.pvp)}${r.est ? ' (precio estimado)' : ''} · ventas ${r.v7} en 7d y ${r.v30} en 30d</div>
        <div class="it-s">Costo ${fmt(r.c)} · stock ${r.st} · proveedor ${esc(r.pr)} · ID Dropi ${f.dropi}</div>
        <div class="it-s"><b>Tiendas que lo anuncian (${f.tiendas}):</b> ${esc(f.anuncios)}</div>
        <div class="it-s"><b>Ofertas y precios:</b> ${esc(f.precios)}</div>
        <div class="it-s"><b>Landings:</b> ${f.landings.map(([a, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(a)}</a>`).join(' · ')}</div>
        <div class="it-s"><b>Ángulos que ya se usan:</b> ${f.usados.map(esc).join(' · ')}</div>
        <div class="it-s"><b>Ángulos nuevos (nadie los usa):</b></div>
        <ol class="rn">${f.nuevos.map(([a, h]) => `<li><b>${esc(a)}.</b> ${esc(h)}</li>`).join('')}</ol>
        <div class="it-s mut">Puntaje: ${f.punt.map((p, i) => `${crit[i]} ${p}`).join(' · ')}</div>
        <div class="it-a" style="margin:6px 0 0"><button class="btn btn-sm" data-calc="${esc(f.n)}">Calcular</button></div></div>`;
    }).join('');
    const tabla = filas.map(x => `<tr><td>${esc(x.n)}${x.rk ? ` <span class="rk-${x.rk}">${x.rk === 'rojo' ? '● marca' : '● sanitario'}</span>` : ''}</td><td>${x.v7}</td><td>${x.v30}</td><td>${fmt(x.c)}</td><td>${fmt(x.pvp)}${x.est ? '*' : ''}</td><td>${fmt(x.u)}</td><td><span class="rv ${cls(x.v)}">${x.v}</span></td></tr>`).join('');
    el.innerHTML = `${secH('radar', 'Radar diario', 'Kit de Kevin Galeano y radar de hoy para Perú')}
    <div class="seg" id="rseg" style="margin-bottom:14px"><button data-t="hoy" class="${tab === 'hoy' ? 'on' : ''}">Radar de hoy</button><button data-t="kit" class="${tab === 'kit' ? 'on' : ''}">Kit y prompt</button></div>
    ${tab === 'hoy' ? `
    <div class="card"><h3>Veredicto de hoy · ${esc(HOY.fecha)}</h3>
      <p class="rk-p">En Perú ningún proveedor llega al rango «validado» (81 a 200 ventas en 7 días) y solo 3 productos entran en «emergente» (20 a 80), así que con los filtros del kit casi no sale nada; amplié el rango y miré 18 productos más.
      Mira primero el <b>kit de grabación con trípode</b> (6 tiendas activas, zona dulce) y el <b>sellador Jaysuing</b> (margen alto, 14 ventas en 7 días); el que más vende, «Gld unisex 2 und» (344 en 7 días), resultó ser unas gafas antirreflectantes: mira su ficha completa en <a href="#dropi">Caza diaria Dropi</a>; las de AliClick están en <a href="#aliclick">Caza diaria AliClick</a>.</p></div>
    <div class="tiles"><div class="t"><small>Validado (81–200 en 7d)</small><b>${HOY.embudo.A}</b></div><div class="t"><small>Emergente (20–80 en 7d)</small><b>${HOY.embudo.B}</b></div><div class="t"><small>Ampliado (5–19 en 7d)</small><b>${HOY.embudo.ampliado}</b></div><div class="t"><small>Más de 200 en 7d</small><b>${HOY.embudo.sobre200}</b></div></div>
    <div class="card"><h3>Tus números de operación</h3><p class="sub">Valores de referencia míos, <b>no medidos</b>: cámbialos por los tuyos y todo se recalcula.</p>
      <div class="row">${camp('entrega', 'Tasa de entrega (%)')}${camp('flete', 'Flete por entrega (S/)')}${camp('devolucion', 'Flete de devolución (S/)')}${camp('comision', 'Comisión de recaudo (%)')}${camp('cpa', 'CPA por pedido generado (S/)')}${camp('umbral', 'Utilidad mínima (S/)')}</div>
      <p class="note">utilidad por pedido generado = entrega × (precio − costo − flete − comisión) − (1 − entrega) × flete de devolución − CPA. Viables: ${cuenta('VIABLE')} · Repreciables: ${cuenta('REPRECIABLE')} · Descartados: ${cuenta('DESCARTADO')}.</p></div>
    <h3 style="margin:16px 0 8px">Finalistas</h3>${fin}
    <div class="card"><h3>Todos los productos evaluados</h3><p class="sub">* precio estimado a 2,5 veces el costo, porque el sugerido no deja margen. Ordenados por ventas de 7 días.</p>
      <div class="tw"><table class="rt"><thead><tr><th>Producto</th><th>7d</th><th>30d</th><th>Costo</th><th>Precio</th><th>Utilidad</th><th>Margen</th></tr></thead><tbody>${tabla}</tbody></table></div></div>
    <div class="card"><h3>Notas de la corrida</h3>${HOY.notas.map(n => `<p class="rk-p">${esc(n)}</p>`).join('')}<p class="rk-p">Marcas en rojo y suplementos en amarillo siguen las banderas del kit (marca registrada: Meta puede tumbar la cuenta; consumibles y cosméticos: registro sanitario).</p></div>
    ` : `
    <div class="card rk">${kitHtml(K.antes)}
      <div class="promptbar"><button class="btn btn-pri btn-sm" id="rcopy">Copiar prompt</button></div>
      <pre class="prompt">${esc(K.prompt)}</pre>
      ${kitHtml(K.despues)}</div>`}`;
    el.querySelectorAll('#rseg button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    el.querySelectorAll('[data-rc]').forEach(i => i.onchange = () => { S.config.radar = Object.assign({}, cfg(), { [i.dataset.rc]: num(i.value) }); Store.save(); render(); });
    el.querySelectorAll('[data-calc]').forEach(b => b.onclick = () => { const r = filas.find(x => x.n === b.dataset.calc); Object.assign(C, { nombre: r.n, precio: r.pvp, costo: r.c }); guardarCalc(); toast('Producto enviado a la Calculadora'); go('calculadora'); });
    const cp = $('#rcopy'); if (cp) cp.onclick = () => { const ok = () => toast('Prompt copiado'); (navigator.clipboard ? navigator.clipboard.writeText(K.prompt).then(ok, () => toast('No se pudo copiar')) : toast('No se pudo copiar')); };
  }
  let tab = 'hoy';
  window.Radar = { vista };
  window.RadarEcon = { cfg, util, evaluar: (c, sug) => evaluar(['', c, sug, 0, 0, 0, '', 0, '', ''], cfg()) };
  if (['radar', 'dropi', 'aliclick'].includes(vista_actual())) render();
  function vista_actual() { return (location.hash || '').slice(1); }
})();
