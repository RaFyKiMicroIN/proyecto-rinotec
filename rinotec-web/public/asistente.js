// Chat del asistente RinoTec. El perfil (cliente/empleado) lo decide el servidor.
const $ = id => document.getElementById(id);
const chat = $("chat"), form = $("form"), input = $("mensaje"), btn = $("enviar"), sug = $("sugerencias");
let historial = [];
let yo = { empleado: false, opciones: {} };

const SUGERENCIAS = {
  cliente: [
    "¿Cuánto cuesta una funda para iPhone 15 y dónde hay?",
    "¿Cuántos días de garantía tiene un cambio de pantalla?",
    "Quiero saber el estado de mi equipo, folio L-26-538",
    "¿Desde cuántas piezas aplica el precio de mayoreo?"
  ],
  empleado: [
    "¿Cuántas fundas de iPhone 15 nos quedan?",
    "¿Hay facturas duplicadas o pagadas dos veces?",
    "¿Qué casos de clientes siguen abiertos?",
    "Busca las órdenes del Colegio Valle Verde",
    "¿Esta laptop Dell ya se había reparado antes en otra sucursal?"
  ]
};

const escapeHtml = t => t.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function render(t) {
  let html = "", lista = false;
  for (const l of escapeHtml(t).split("\n")) {
    const m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if (m) { if (!lista) { html += "<ul>"; lista = true; } html += `<li>${m[1]}</li>`; continue; }
    if (lista) { html += "</ul>"; lista = false; }
    if (l.trim()) html += `<p>${l.replace(/^#+\s*/, "")}</p>`;
  }
  if (lista) html += "</ul>";
  return html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}
function agregar(rol, texto, clase = "") {
  const fila = document.createElement("div");
  fila.className = `fila ${rol}`;
  if (rol === "bot") { const av = document.createElement("img"); av.className = "avatar"; av.src = "img/logo_icono.png"; av.alt = "Rino"; fila.appendChild(av); }
  const div = document.createElement("div");
  div.className = `msg ${rol} ${clase}`;
  div.innerHTML = rol === "bot" ? render(texto) : escapeHtml(texto);
  fila.appendChild(div); chat.appendChild(fila); chat.scrollTop = chat.scrollHeight;
  return fila;
}
// Las sugerencias se ocultan en cuanto el usuario empieza a escribir o ya inició la conversación
function actualizarSugerencias() { sug.hidden = input.value.trim().length > 0 || historial.length > 0; }
function pintar() {
  const perfil = yo.empleado ? "empleado" : "cliente";
  $("modo").textContent = yo.empleado ? `Empleado: ${yo.nombre}` : "Modo cliente";
  $("modo").classList.toggle("emp", yo.empleado);
  $("btnAcceso").hidden = yo.empleado;
  $("btnSalir").hidden = !yo.empleado;
  sug.innerHTML = "";
  for (const s of SUGERENCIAS[perfil]) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = s; b.onclick = () => enviar(s); sug.appendChild(b);
  }
  chat.innerHTML = '<div class="portada"><img src="img/logo.png" alt="RinoTec"></div>'; historial = [];
  actualizarSugerencias();
  agregar("bot", yo.empleado
    ? `Hola, ${yo.nombre}. Soy **Rino** (asistente de IA, modo empleado). Puedo consultar inventario de las 5 sucursales, órdenes de servicio, pedidos de mayoreo, facturas de proveedores, políticas vigentes y casos de clientes abiertos.`
    : "¡Hola! Soy **Rino**, el asistente de inteligencia artificial de RinoTec. Puedo ayudarte con el estado de tu equipo, precios, existencias de accesorios y garantías. ¿En qué te ayudo?");
}
async function cargarSesion() {
  try { yo = await (await fetch("/api/me", { credentials: "same-origin" })).json(); } catch { yo = { empleado: false, opciones: {} }; }
  pintar();
  if (new URLSearchParams(location.search).get("acceso") === "empleados" && !yo.empleado) abrirPanel();
}
async function enviar(texto) {
  texto = texto.trim();
  if (!texto || btn.disabled) return;
  agregar("user", texto); historial.push({ role: "user", content: texto });
  input.value = ""; btn.disabled = true; actualizarSugerencias();
  const espera = agregar("bot", "Rino está escribiendo…", "escribiendo");
  try {
    const r = await fetch("/api/chat", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historial }) });
    const data = await r.json(); espera.remove();
    if (!r.ok) throw new Error(data.error || "Error");
    agregar("bot", data.reply); historial.push({ role: "assistant", content: data.reply });
  } catch (e) { espera.remove(); agregar("bot", e.message || "No se pudo conectar con el asistente.", "error"); historial.pop(); }
  finally { btn.disabled = false; actualizarSugerencias(); input.focus(); }
}

// ----- Acceso de empleados -----
function abrirPanel() {
  const { entra, codigo } = yo.opciones || {};
  $("btnEntra").hidden = !entra;
  $("btnEntra").href = "/.auth/login/aad?post_login_redirect_uri=" + encodeURIComponent("/asistente");
  $("formCodigo").hidden = !codigo;
  $("sinAcceso").hidden = !!(entra || codigo);
  $("errorCodigo").textContent = "";
  $("panel").hidden = false;
  if (codigo) $("codigo").focus();
}
$("btnAcceso").onclick = abrirPanel;
$("cerrarPanel").onclick = () => { $("panel").hidden = true; };
$("formCodigo").onsubmit = async e => {
  e.preventDefault();
  const r = await fetch("/api/login-codigo", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: $("codigo").value }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { $("errorCodigo").textContent = data.error || "No se pudo iniciar sesión."; return; }
  $("codigo").value = ""; $("panel").hidden = true; cargarSesion();
};
$("btnSalir").onclick = async () => {
  const data = await (await fetch("/api/logout", { method: "POST", credentials: "same-origin" })).json().catch(() => ({}));
  if (yo.metodo === "entra" && data.entra) { location.href = data.entra; return; }
  cargarSesion();
};

input.addEventListener("input", actualizarSugerencias);
form.addEventListener("submit", e => { e.preventDefault(); enviar(input.value); });
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input.value); } });
cargarSesion();
