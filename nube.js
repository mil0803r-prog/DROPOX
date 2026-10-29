'use strict';
/* DROPOX — cuenta y sincronización con Supabase (login con Google).
   Si config.js no tiene url y key, la app sigue funcionando solo en este dispositivo. */
const Nube = (() => {
  const cfg = window.DROPOX_CFG || {};
  const listo = !!(cfg.url && cfg.key && window.supabase);
  const N = { listo, activo: false, email: '', estado: '' };
  const OK = (cfg.permitidos || []).map(x => String(x).toLowerCase());
  const permitido = e => !OK.length || OK.includes(String(e || '').toLowerCase());
  const LK = 'dropox.nube.uid', DK = 'dropox.nube.sucio';
  let sb, user, recuperando = false, reintentos = 0, timer, remotoVer = null, subiendo = false, pendiente = false, sincronizado = false;

  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const G = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.800 2.400 30.300 0 24 0 14.600 0 6.600 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.900 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.600 42.600 14.600 48 24 48z"/></svg>';

  function pantalla(html) {
    let o = document.getElementById('nubeOv');
    if (!o) { o = document.createElement('div'); o.id = 'nubeOv'; o.className = 'nube-ov'; document.body.appendChild(o); }
    o.innerHTML = `<div class="nube-box"><img src="icon.svg" alt="DROPOX" class="nube-logo"><h1>DROPOX</h1>${html}</div>`;
    return o;
  }
  function cerrarPantalla() { const o = document.getElementById('nubeOv'); if (o) o.remove(); }

  const ERR = [
    ['Invalid login credentials', 'Correo o contraseña incorrectos.'],
    ['Email not confirmed', 'Falta confirmar tu correo. Revisa tu bandeja y abre el enlace que te enviamos.'],
    ['already registered', 'Ese correo ya tiene cuenta. Pulsa Entrar.'],
    ['rate limit', 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'],
    ['at least', 'La contraseña debe tener al menos 8 caracteres.'],
    ['weak', 'La contraseña es muy débil. Usa letras y números.'],
  ];
  const traducir = e => { const m = (e && e.message) || ''; const f = ERR.find(x => m.toLowerCase().includes(x[0].toLowerCase())); return f ? f[1] : 'No se pudo completar. Intenta de nuevo.'; };
  const volver = () => location.origin + location.pathname;

  function pantallaLogin(msg) {
    pantalla(`<p>Entra para guardar tus pedidos y gastos y verlos en tu PC y en tu celular.</p>
      <form class="nube-form" id="nubeF" novalidate>
        <input id="nubeEmail" type="email" autocomplete="email" placeholder="Correo" required>
        <input id="nubePass" type="password" autocomplete="current-password" placeholder="Contraseña (mínimo 8 caracteres)" minlength="8" required>
        <button class="btn btn-pri nube-btn" id="nubeIn" type="submit">Entrar</button>
        <button class="btn nube-btn" id="nubeReg" type="button">Crear cuenta</button>
        <button class="nube-link" id="nubeOlv" type="button">Olvidé mi contraseña</button>
      </form>
      <div class="nube-sep"><span>o</span></div>
      <button class="nube-g" id="nubeG" type="button">${G}<span>Continuar con Google</span></button>
      <div class="nube-msg" id="nubeMsg" role="status">${msg ? esc(msg) : ''}</div>`);
    const $m = t => { document.getElementById('nubeMsg').textContent = t; };
    const val = () => {
      const email = document.getElementById('nubeEmail').value.trim(), pass = document.getElementById('nubePass').value;
      return { email, pass };
    };
    const ocupado = on => document.querySelectorAll('#nubeF button, #nubeG').forEach(b => { b.disabled = on; });
    document.getElementById('nubeF').onsubmit = async e => {
      e.preventDefault();
      const { email, pass } = val();
      if (!email || !pass) return $m('Escribe tu correo y tu contraseña.');
      ocupado(true); $m('Entrando…');
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) { ocupado(false); $m(traducir(error)); }
    };
    document.getElementById('nubeReg').onclick = async () => {
      const { email, pass } = val();
      if (!email || !email.includes('@')) return $m('Escribe un correo válido.');
      if (!permitido(email)) return $m('Esta plataforma es privada. Ese correo no tiene permiso.');
      if (pass.length < 8) return $m('La contraseña debe tener al menos 8 caracteres.');
      ocupado(true); $m('Creando tu cuenta…');
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: volver() } });
      if (error) { ocupado(false); return $m(traducir(error)); }
      if (!data.session) { ocupado(false); $m('Te enviamos un correo. Ábrelo, confirma tu cuenta y vuelve aquí para entrar.'); }
    };
    document.getElementById('nubeOlv').onclick = async () => {
      const { email } = val();
      if (!email || !email.includes('@')) return $m('Escribe tu correo arriba y vuelve a pulsar.');
      ocupado(true);
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: volver() });
      ocupado(false);
      $m(error ? traducir(error) : 'Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva.');
    };
    document.getElementById('nubeG').onclick = async () => {
      ocupado(true);
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volver() } });
      if (error) { ocupado(false); $m('No se pudo abrir Google. Intenta de nuevo.'); }
    };
  }

  function pantallaNuevaClave() {
    pantalla(`<p>Escribe tu nueva contraseña.</p>
      <form class="nube-form" id="nubeNF" novalidate>
        <input id="nubeNueva" type="password" autocomplete="new-password" placeholder="Nueva contraseña (mínimo 8 caracteres)" minlength="8" required>
        <button class="btn btn-pri nube-btn" type="submit">Guardar contraseña</button>
      </form>
      <div class="nube-msg" id="nubeMsg" role="status"></div>`);
    document.getElementById('nubeNF').onsubmit = async e => {
      e.preventDefault();
      const p = document.getElementById('nubeNueva').value, m = document.getElementById('nubeMsg');
      if (p.length < 8) { m.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
      const { data, error } = await sb.auth.updateUser({ password: p });
      if (error) { m.textContent = traducir(error); return; }
      recuperando = false;
      entrar(data.user);
    };
  }

  const tieneDatos = () => !S.demo && ((S.pedidos || []).length || (S.fijos || []).length || (S.ads || []).length);

  const unir = (dest, src) => { try { return !!(window.Tienda && Tienda.fusionar && Tienda.fusionar(dest, src)); } catch (e) { return false; } };

  function adoptar(c, ver) {
    const b = DEFAULTS();
    // lo que solo existe en este dispositivo (productos de la tienda) se suma, nunca se pierde
    const extra = unir(c, S);
    S = { ...b, ...c, config: { ...b.config, ...(c.config || {}) } };
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    remotoVer = ver;
    render();
    if (extra) { ls.set(DK, '1'); setTimeout(push, 1500); }
  }

  async function subir() {
    if (!N.activo || !sincronizado) return;
    if (subiendo) { pendiente = true; return; }
    subiendo = true; timer = null;
    let error = null;
    try {
      // si otro dispositivo guardó mientras tanto, se unen sus productos antes de subir (no se pisa su trabajo)
      const v = await sb.from('datos').select('actualizado').eq('user_id', user.id).maybeSingle();
      if (v.data && remotoVer && v.data.actualizado !== remotoVer) {
        const r = await sb.from('datos').select('contenido').eq('user_id', user.id).maybeSingle();
        if (r.data && unir(S, r.data.contenido || {})) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} render(); }
      }
      const ts = new Date().toISOString();
      const up = await sb.from('datos').upsert({ user_id: user.id, contenido: S, actualizado: ts });
      error = up.error;
      if (!error) { remotoVer = ts; ls.del(DK); estado('Sincronizado'); reintentos = 0; }
    } catch (e) { error = e; }
    if (error) {
      estado('Error al sincronizar: ' + String(error.message || error).slice(0, 80) + ' · reintentando');
      if (reintentos < 6) { reintentos++; clearTimeout(timer); timer = setTimeout(subir, Math.min(30000, 2000 * reintentos * reintentos)); }
    }
    subiendo = false;
    if (pendiente) { pendiente = false; subir(); }
  }

  function push() {
    if (!N.activo || !sincronizado) return;
    ls.set(DK, '1'); estado('Guardando…');
    clearTimeout(timer); timer = setTimeout(subir, 900);
  }

  function estado(t) {
    N.estado = t;
    const e = document.getElementById('nubeEst'); if (e) e.textContent = t;
  }

  function elegir(fnNube, fnLocal) {
    pantalla(`<p>Esta cuenta ya tiene datos guardados, y este dispositivo también tiene los suyos. ¿Cuáles quieres conservar?</p>
      <button class="btn btn-pri nube-btn" id="nubeUsaNube" type="button">Usar los de mi cuenta</button>
      <button class="btn nube-btn" id="nubeUsaLocal" type="button">Usar los de este dispositivo</button>
      <div class="nube-msg">Los que no elijas se reemplazan.</div>`);
    document.getElementById('nubeUsaNube').onclick = fnNube;
    document.getElementById('nubeUsaLocal').onclick = fnLocal;
  }

  const avisar = () => dispatchEvent(new Event('dropox:listo'));

  async function entrar(u) {
    user = u; N.email = u.email || '';
    if (!permitido(u.email)) { await sb.auth.signOut(); ls.del(KEY); ls.del(LK); ls.del(DK); user = null; N.email = ''; pantallaLogin('Esta plataforma es privada. El correo ' + (u.email || '') + ' no tiene permiso para entrar.'); return; }
    pantalla('<p class="nube-msg">Cargando tus datos…</p>');
    const { data, error } = await sb.from('datos').select('contenido,actualizado').eq('user_id', u.id).maybeSingle();
    if (error) {
      cerrarPantalla(); N.activo = true; sincronizado = false; estado('Sin conexión. Trabajando en este dispositivo.');
      toast('No se pudo conectar con tu cuenta');
      return;
    }
    const vinculado = ls.get(LK) === u.id, sucio = ls.get(DK) === '1';
    const finalizar = () => { ls.set(LK, u.id); N.activo = true; sincronizado = true; cerrarPantalla(); render(); avisar(); };
    if (!data) {
      N.activo = true; sincronizado = true; ls.set(LK, u.id); cerrarPantalla();
      await subir(); render(); avisar(); return;
    }
    if (vinculado && sucio) {
      remotoVer = data.actualizado; finalizar(); await subir(); return;
    }
    if (!vinculado && tieneDatos()) {
      elegir(() => { adoptar(data.contenido, data.actualizado); finalizar(); },
        async () => { remotoVer = data.actualizado; finalizar(); await subir(); });
      return;
    }
    adoptar(data.contenido || {}, data.actualizado); finalizar(); estado('Sincronizado');
  }

  async function refrescar() {
    if (!N.activo || document.hidden) return;
    if (!sincronizado) { if (user) await entrar(user); return; }
    if (subiendo || timer || ls.get(DK) === '1') return;
    const { data } = await sb.from('datos').select('actualizado').eq('user_id', user.id).maybeSingle();
    if (!data || data.actualizado === remotoVer) return;
    const d = document.getElementById('dlg'); if (d && d.open) return;
    const r = await sb.from('datos').select('contenido,actualizado').eq('user_id', user.id).maybeSingle();
    if (r.data) { adoptar(r.data.contenido || {}, r.data.actualizado); estado('Sincronizado'); toast('Datos actualizados'); }
  }

  async function salir() {
    clearTimeout(timer); timer = null;
    if (sincronizado && ls.get(DK) === '1') await subir();
    await sb.auth.signOut();
    ls.del(KEY); ls.del(LK); ls.del(DK);
    location.reload();
  }

  function cardHtml() {
    if (!listo) return '';
    return `<div class="card"><h3>Cuenta</h3><p class="sub">${N.activo ? 'Tus datos se guardan en tu cuenta de Google.' : 'Sin sesión.'}</p>
      <div class="nube-fila"><div><b>${esc(N.email || '')}</b><div class="note" id="nubeEst">${esc(N.estado)}</div></div>
      <button class="btn" id="nubeOut" type="button">Cerrar sesión</button></div></div>`;
  }
  function bind() { const b = document.getElementById('nubeOut'); if (b) b.onclick = () => ask('¿Cerrar sesión en este dispositivo? Tus datos quedan guardados en tu cuenta.', salir, 'Cerrar sesión'); }

  async function init() {
    if (!listo) return;
    sb = supabase.createClient(cfg.url, cfg.key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    pantalla('<p class="nube-msg">Cargando…</p>');
    sb.auth.onAuthStateChange((ev, ses) => {
      if (ev === 'PASSWORD_RECOVERY') { recuperando = true; pantallaNuevaClave(); return; }
      if (ev === 'SIGNED_IN' && ses) {
        setTimeout(() => { if (!recuperando && !N.activo && (!user || user.id !== ses.user.id)) entrar(ses.user); }, 150);
      }
    });
    const { data, error } = await sb.auth.getSession();
    if (!recuperando) {
      if (error || !data.session) pantallaLogin(error ? 'No se pudo iniciar sesión. Intenta de nuevo.' : '');
      else await entrar(data.session.user);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescar(); });
    addEventListener('online', refrescar);
  }

  const token = async () => { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; };
  Object.assign(N, { push, cardHtml, bind, init, token });
  return N;
})();
window.Nube = Nube;
Nube.init();
