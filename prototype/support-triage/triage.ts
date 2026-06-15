/**
 * PROTOTYPE JETABLE — agent de triage support Gestu Comply.
 *
 * But : sentir le comportement agentique (boucle tool-use multi-etapes) avant
 * d'industrialiser en Edge Function. LECTURE SEULE. Hors prod.
 *
 * Lancer (Deno) :
 *   ANTHROPIC_API_KEY=sk-... \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_KEY=<service_role ou anon> \
 *   deno run --allow-net --allow-env prototype/support-triage/triage.ts "le client X dit que l'onglet Rapports plante"
 *
 * Notes securite :
 *  - service_role bypass la RLS -> visibilite complete (POC). La cle reste en
 *    variable d'env locale, jamais commitee/logguee. Utilise anon pour rester
 *    cloisonne par RLS.
 *  - Les outils sont une WHITELIST en lecture seule. Aucun SQL libre, aucun write.
 *  - Des donnees tenant partent vers Anthropic : OK pour un POC sur tes propres
 *    donnees, a cadrer (DPA/RGPD) avant toute mise en prod.
 */

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_KEY");
const MODEL = Deno.env.get("TRIAGE_MODEL") ?? "claude-sonnet-4-6";
const MAX_TURNS = 10;

if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Manque ANTHROPIC_API_KEY, SUPABASE_URL ou SUPABASE_KEY dans l'env.");
  Deno.exit(1);
}
const symptom = Deno.args.join(" ").trim();
if (!symptom) {
  console.error('Usage: deno run ... triage.ts "description du symptome"');
  Deno.exit(1);
}

// ── Outils DB (lecture seule, scopes) ───────────────────────────────────────
const rest = (path: string) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

async function q(path: string): Promise<unknown> {
  const res = await rest(path);
  if (!res.ok) return { _error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return await res.json();
}

const enc = encodeURIComponent;

const TOOLS: Record<
  string,
  { schema: Record<string, unknown>; run: (i: Record<string, string>) => Promise<unknown> }
> = {
  search_missions: {
    schema: {
      name: "search_missions",
      description: "Recherche des missions par nom (partiel). Retourne id, nom, statut, cabinet_id, client_id.",
      input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    run: (i) =>
      q(`missions?name=ilike.*${enc(i.text)}*&select=id,name,status,cabinet_id,client_id,framework_id&limit=10`),
  },
  get_mission: {
    schema: {
      name: "get_mission",
      description: "Detail complet d'une mission par son id.",
      input_schema: { type: "object", properties: { mission_id: { type: "string" } }, required: ["mission_id"] },
    },
    run: (i) => q(`missions?id=eq.${enc(i.mission_id)}&select=*`),
  },
  mission_stats: {
    schema: {
      name: "mission_stats",
      description:
        "Compteurs d'une mission : evaluations par statut, demandes de preuve par statut, nb de membres. Utile pour reperer un blocage.",
      input_schema: { type: "object", properties: { mission_id: { type: "string" } }, required: ["mission_id"] },
    },
    run: async (i) => {
      const mid = enc(i.mission_id);
      const [assess, evid, members] = await Promise.all([
        q(`control_assessments?mission_id=eq.${mid}&select=status`),
        q(`mission_evidence_requests?mission_id=eq.${mid}&select=status`),
        q(`mission_members?mission_id=eq.${mid}&select=user_id,role`),
      ]);
      const tally = (rows: unknown, key: string) =>
        Array.isArray(rows)
          ? rows.reduce((a: Record<string, number>, r: Record<string, string>) => {
              a[r[key] ?? "?"] = (a[r[key] ?? "?"] ?? 0) + 1;
              return a;
            }, {})
          : rows;
      return {
        assessments_by_status: tally(assess, "status"),
        evidence_by_status: tally(evid, "status"),
        members: Array.isArray(members) ? members.length : members,
      };
    },
  },
  get_organization: {
    schema: {
      name: "get_organization",
      description: "Detail d'une organisation (cabinet ou client) par id.",
      input_schema: { type: "object", properties: { org_id: { type: "string" } }, required: ["org_id"] },
    },
    run: (i) => q(`organizations?id=eq.${enc(i.org_id)}&select=*`),
  },
  get_user: {
    schema: {
      name: "get_user",
      description:
        "Profil d'un utilisateur par email. Inclut is_active et les permissions cabinet (can_manage_members, can_assign_team...). Utile pour les problemes de permission/RLS.",
      input_schema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] },
    },
    run: (i) => q(`users?email=eq.${enc(i.email)}&select=*`),
  },
};

// ── Boucle agentique (Anthropic Messages API, tool use) ──────────────────────
const SYSTEM = `Tu es l'agent de triage support de Gestu Comply, plateforme SaaS multi-tenant d'audit/conformite (cloisonnee par cabinet).
On te donne un symptome remonte par un utilisateur (auditeur ou client). Enquete avec les outils en LECTURE SEULE, puis conclus.
Methode : pars du symptome -> retrouve la mission/le cabinet/l'utilisateur concerne -> regarde les compteurs et les permissions -> forme une hypothese, verifie-la.
Ne devine pas sans avoir regarde les donnees. Si un outil renvoie _error, adapte-toi.
Conclus en FRANCAIS avec EXACTEMENT ce format :
  CATEGORIE: <bug_code | probleme_donnee | permission_rls | erreur_utilisateur | infra_externe | indetermine>
  GRAVITE: <critique | elevee | moyenne | faible>
  CAUSE PROBABLE: <1-2 phrases, appuyees sur ce que tu as vu>
  PROCHAINE ACTION: <l'etape concrete pour l'equipe>
  DONNEES VUES: <les ids/faits cles consultes>`;

type Block = Record<string, unknown>;
const messages: { role: string; content: string | Block[] }[] = [
  { role: "user", content: `Symptome a trier : ${symptom}` },
];
let totalIn = 0, totalOut = 0;

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      tools: Object.values(TOOLS).map((t) => t.schema),
      messages,
    }),
  });
  if (!res.ok) {
    console.error(`\nErreur API Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    Deno.exit(1);
  }
  const data = await res.json();
  totalIn += data.usage?.input_tokens ?? 0;
  totalOut += data.usage?.output_tokens ?? 0;

  const content = data.content as Block[];
  for (const b of content) {
    if (b.type === "text") console.log(`\n💭 ${b.text}`);
    if (b.type === "tool_use") console.log(`\n🔧 [${turn}] ${b.name}(${JSON.stringify(b.input)})`);
  }

  if (data.stop_reason !== "tool_use") {
    console.log(`\n📊 Tokens : ${totalIn} in / ${totalOut} out (~$${((totalIn * 3 + totalOut * 15) / 1e6).toFixed(4)} si opus, moins en sonnet)`);
    break;
  }

  // executer les tool_use et renvoyer les resultats
  messages.push({ role: "assistant", content });
  const results: Block[] = [];
  for (const b of content) {
    if (b.type !== "tool_use") continue;
    const tool = TOOLS[b.name as string];
    const out = tool ? await tool.run(b.input as Record<string, string>) : { _error: "outil inconnu" };
    const preview = JSON.stringify(out).slice(0, 300);
    console.log(`   ↳ ${preview}${preview.length >= 300 ? "…" : ""}`);
    results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out).slice(0, 4000) });
  }
  messages.push({ role: "user", content: results });

  if (turn === MAX_TURNS) console.log("\n⚠️ Limite de tours atteinte sans conclusion.");
}
