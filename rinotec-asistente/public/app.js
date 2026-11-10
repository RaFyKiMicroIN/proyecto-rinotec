// Frontend del chat RinoTec (JavaScript puro, sin frameworks)
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("mensaje");
const btn = document.getElementById("enviar");
const sug = document.getElementById("sugerencias");
let perfil = "cliente";
let historial = [];

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
    "¿Esta laptop Dell ya se había reparado antes en otra sucursal?",
    "Un cliente perdió su nota de garantía de un iPhone 12 en Zacatecas, ¿qué hago?"
  ]
};

function escapeHtml(t) {
  return t.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// Markdown mínimo: negritas, listas y saltos de línea
function render(t) {
  const lines = escapeHtml(t).split("\n");
  let html = "", lista = false;
  for (const l of lines) {
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
  if (rol === "bot") {
    const av = document.createElement("img");
    av.className = "avatar"; av.src = "img/logo_icono.png"; av.alt = "Rino";
    fila.appendChild(av);
  }
  const div = document.createElement("div");
  div.className = `msg ${rol} ${clase}`;
  div.innerHTML = rol === "bot" ? render(texto) : escapeHtml(texto);
  fila.appendChild(div);
  chat.appendChild(fila);
  chat.scrollTop = chat.scrollHeight;
  return fila;
}

function pintarSugerencias() {
  sug.innerHTML = "";
  for (const s of SUGERENCIAS[perfil]) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = s;
    b.onclick = () => enviar(s);
    sug.appendChild(b);
  }
}

function bienvenida() {
  chat.innerHTML = '<div class="portada"><img src="img/logo.png" alt="RinoTec"></div>'; historial = [];
  agregar("bot", perfil === "cliente"
    ? "¡Hola! Soy **Rino**, el asistente de inteligencia artificial de RinoTec. Puedo ayudarte con el estado de tu equipo, precios, existencias de accesorios, garantías y pedidos de mayoreo. ¿En qué te ayudo?"
    : "Hola, soy **Rino** (asistente de IA, modo empleado). Puedo consultar inventario de las 5 sucursales, órdenes de servicio, pedidos de mayoreo, facturas de proveedores, políticas vigentes y casos de clientes abiertos.");
}

async function enviar(texto) {
  texto = texto.trim();
  if (!texto || btn.disabled) return;
  agregar("user", texto);
  historial.push({ role: "user", content: texto });
  input.value = ""; btn.disabled = true;
  const espera = agregar("bot", "Rino está escribiendo…", "escribiendo");
  try {
    const r = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: historial, perfil })
    });
    const data = await r.json();
    espera.remove();
    if (!r.ok) throw new Error(data.error || "Error");
    agregar("bot", data.reply);
    historial.push({ role: "assistant", content: data.reply });
  } catch (e) {
    espera.remove();
    agregar("bot", e.message || "No se pudo conectar con el asistente.", "error");
    historial.pop();
  } finally {
    btn.disabled = false; input.focus();
  }
}

form.addEventListener("submit", e => { e.preventDefault(); enviar(input.value); });
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input.value); } });
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("activo"));
  t.classList.add("activo"); perfil = t.dataset.perfil; pintarSugerencias(); bienvenida();
}));
pintarSugerencias(); bienvenida();
