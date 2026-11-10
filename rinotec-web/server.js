// RinoTec - sitio web + asistente con IA (Node.js + Express)
// - Página promocional pública (/)
// - Asistente para clientes: acceso libre, usa un agente con conocimiento limitado
// - Asistente para empleados: requiere iniciar sesión, usa el agente con todo el conocimiento interno
// El tipo de usuario lo decide SIEMPRE el servidor, nunca el navegador.
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const PORT = env.PORT || 3000;

// ---------- Configuración (variables de entorno / App Settings) ----------
const ENDPOINT = env.FOUNDRY_PROJECT_ENDPOINT;
const AGENTES = {
  cliente:  { name: env.FOUNDRY_AGENT_CLIENTES || env.FOUNDRY_AGENT_NAME, version: env.FOUNDRY_AGENT_CLIENTES_VERSION || env.FOUNDRY_AGENT_VERSION },
  empleado: { name: env.FOUNDRY_AGENT_EMPLEADOS || env.FOUNDRY_AGENT_NAME, version: env.FOUNDRY_AGENT_EMPLEADOS_VERSION || env.FOUNDRY_AGENT_VERSION }
};
const AUTH_ENTRA = env.AUTH_ENTRA === "true";                 // true si se activó la autenticación de App Service con Microsoft Entra ID
const PERMITIDOS = (env.EMPLEADOS_PERMITIDOS || "")            // correos autorizados como empleados (separados por coma); vacío = cualquier cuenta del tenant
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const CODIGO = env.EMPLOYEE_ACCESS_CODE || "";                 // respaldo: código de acceso para empleados
const SECRETO = env.SESSION_SECRET || "";                      // para firmar la cookie de sesión del código
const DEV_EMPLEADO = env.DEV_EMPLEADO === "true";              // solo para pruebas locales

// ---------- Cliente del agente de Foundry (patrón de la clase 15) ----------
let openaiClient;
async function getClient() {
  if (!openaiClient) {
    const project = new AIProjectClient(ENDPOINT, new DefaultAzureCredential());
    openaiClient = await project.getOpenAIClient();
  }
  return openaiClient;
}

// ---------- Identidad del usuario ----------
function leerCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
}
function firmar(datos) {
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = crypto.createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}
function verificar(token) {
  if (!token || !SECRETO) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = crypto.createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
  return datos.exp > Date.now() ? datos : null;
}
// Devuelve { nombre, metodo } si el usuario es empleado autenticado; null si es cliente
function empleado(req) {
  // 1) Microsoft Entra ID mediante la autenticación integrada de App Service (Easy Auth).
  //    App Service elimina estos encabezados si vienen del navegador, así que no se pueden falsificar.
  const principal = req.headers["x-ms-client-principal"];
  if (AUTH_ENTRA && principal) {
    try {
      const p = JSON.parse(Buffer.from(principal, "base64").toString());
      const claims = Object.fromEntries((p.claims || []).map(c => [c.typ, c.val]));
      const correo = (req.headers["x-ms-client-principal-name"] || claims.preferred_username || "").toLowerCase();
      if (!PERMITIDOS.length || PERMITIDOS.includes(correo)) return { nombre: claims.name || correo, correo, metodo: "entra" };
    } catch { /* encabezado inválido: se trata como cliente */ }
  }
  // 2) Código de acceso (respaldo si la cuenta no tiene permisos para registrar apps en Entra ID)
  const sesion = verificar(leerCookies(req).rt_emp);
  if (sesion) return { nombre: "Empleado RinoTec", metodo: "codigo" };
  // 3) Pruebas locales
  if (DEV_EMPLEADO) return { nombre: "Empleado (prueba local)", metodo: "dev" };
  return null;
}

// ---------- App ----------
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.get("/api/me", (req, res) => {
  const emp = empleado(req);
  res.json({
    empleado: !!emp, nombre: emp?.nombre || null, metodo: emp?.metodo || null,
    opciones: { entra: AUTH_ENTRA, codigo: !!(CODIGO && SECRETO) }
  });
});

// Login con código (respaldo). Límite simple de intentos por IP.
const intentos = new Map();
app.post("/api/login-codigo", (req, res) => {
  if (!CODIGO || !SECRETO) return res.status(404).json({ error: "El acceso con código no está habilitado." });
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const r = intentos.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - r.t > 15 * 60 * 1000) { r.n = 0; r.t = Date.now(); }
  if (r.n >= 5) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  const dado = Buffer.from(String(req.body?.codigo || ""));
  const real = Buffer.from(CODIGO);
  const ok = dado.length === real.length && crypto.timingSafeEqual(dado, real);
  if (!ok) { r.n++; intentos.set(ip, r); return res.status(401).json({ error: "Código incorrecto." }); }
  intentos.delete(ip);
  const token = firmar({ rol: "empleado", exp: Date.now() + 8 * 60 * 60 * 1000 });
  const seguro = req.headers["x-forwarded-proto"] === "https" || req.secure ? "; Secure" : "";
  res.setHeader("Set-Cookie", `rt_emp=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${seguro}`);
  res.json({ ok: true });
});

app.post("/api/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "rt_emp=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true, entra: AUTH_ENTRA ? "/.auth/logout?post_logout_redirect_uri=/" : null });
});

app.post("/api/chat", async (req, res) => {
  try {
    const emp = empleado(req);
    const perfil = emp ? "empleado" : "cliente";       // el navegador no puede elegir el perfil
    const agente = AGENTES[perfil];
    const historial = (req.body?.messages || []).slice(-12)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ type: "message", role: m.role, content: m.content.slice(0, 2000) }));
    if (!historial.length || historial[historial.length - 1].role !== "user") return res.status(400).json({ error: "Mensaje vacío" });

    const contexto = emp
      ? `Perfil del usuario: EMPLEADO de RinoTec autenticado (${emp.nombre}).`
      : "Perfil del usuario: CLIENTE de RinoTec (no es empleado; no compartir información interna).";
    const input = [{ type: "message", role: "user", content: contexto }, ...historial];

    const agentReference = { name: agente.name, type: "agent_reference" };
    if (agente.version) agentReference.version = String(agente.version);

    const client = await getClient();
    const response = await client.responses.create({ input, agent_reference: agentReference });
    res.json({ reply: response.output_text || "No obtuve respuesta del agente.", perfil });
  } catch (err) {
    console.error("Error al consultar el agente:", err?.status, err?.message);
    res.status(500).json({ error: "El asistente no está disponible en este momento. Intenta de nuevo en unos segundos." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, agentes: { cliente: AGENTES.cliente.name, empleado: AGENTES.empleado.name }, entra: AUTH_ENTRA }));

if (env.NODE_ENV !== "test") app.listen(PORT, () => console.log(`RinoTec web escuchando en el puerto ${PORT}`));
export default app;
