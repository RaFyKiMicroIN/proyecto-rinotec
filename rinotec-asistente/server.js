// RinoTec - backend del asistente con IA
// Node.js + Express. Conversa con un agente de Microsoft Foundry usando la Responses API
// y autenticación de Microsoft Entra ID (DefaultAzureCredential):
//  - En tu computadora usa la sesión de "az login".
//  - En Azure App Service usa la identidad administrada de la aplicación.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ENDPOINT = process.env.FOUNDRY_PROJECT_ENDPOINT; // Punto de conexión DEL PROYECTO (no el del agente)
const AGENT_NAME = process.env.FOUNDRY_AGENT_NAME;     // Nombre exacto del agente en Foundry
const AGENT_VERSION = process.env.FOUNDRY_AGENT_VERSION; // Versión ACTIVA del agente (debe coincidir con Foundry)

if (!ENDPOINT || !AGENT_NAME) {
  console.error("Faltan variables de entorno FOUNDRY_PROJECT_ENDPOINT y/o FOUNDRY_AGENT_NAME");
}

const project = new AIProjectClient(ENDPOINT, new DefaultAzureCredential());
let openaiClient; // se crea una sola vez
async function getClient() {
  if (!openaiClient) openaiClient = await project.getOpenAIClient();
  return openaiClient;
}

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

const PERFILES = {
  cliente: "Perfil del usuario: CLIENTE de RinoTec (no es empleado; no compartir información interna).",
  empleado: "Perfil del usuario: EMPLEADO de RinoTec (personal interno autorizado)."
};

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], perfil = "cliente" } = req.body || {};
    // Solo los últimos 12 turnos, texto plano y con longitud limitada
    const historial = messages.slice(-12)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!historial.length || historial[historial.length - 1].role !== "user") {
      return res.status(400).json({ error: "Mensaje vacío" });
    }
    const input = [{ role: "user", content: PERFILES[perfil] || PERFILES.cliente }, ...historial]
      .map(m => ({ type: "message", ...m }));

    // Mismo patrón visto en la clase 15 (Python: extra_body={"agent_reference": {...}}):
    // se manda la referencia al agente con name, version y type "agent_reference".
    const agentReference = { name: AGENT_NAME, type: "agent_reference" };
    if (AGENT_VERSION) agentReference.version = String(AGENT_VERSION);

    const client = await getClient();
    const response = await client.responses.create({ input, agent_reference: agentReference });
    res.json({ reply: response.output_text || "No obtuve respuesta del agente." });
  } catch (err) {
    console.error("Error al consultar el agente:", err?.status, err?.message);
    res.status(500).json({ error: "El asistente no está disponible en este momento. Intenta de nuevo en unos segundos." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, agente: AGENT_NAME || null, version: AGENT_VERSION || null }));

app.listen(PORT, () => console.log(`RinoTec asistente escuchando en el puerto ${PORT}`));
