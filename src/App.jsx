import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Wrench, Calendar as Cal, DollarSign, Package, Plus, X, Check, Lightbulb, LogOut, Trash2, Clock, ChevronLeft, ChevronRight, StickyNote, CheckCircle2, AlertCircle, Truck, FileText, Pencil, TrendingUp } from "lucide-react";
import { supabase } from "./supabaseClient";

const TZ = "America/Sao_Paulo";
const PAY = ["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto"];
const WAR = ["Nenhuma", "6 meses", "1 ano"];

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => Math.random().toString(36).slice(2, 10);
const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtD = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
function weekRange() { const n = brNow(); const day = (n.getDay() + 6) % 7; const mon = new Date(n); mon.setDate(n.getDate() - day); mon.setHours(0, 0, 0, 0); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59); return [iso(mon), iso(sun)]; }

const empty = { clients: [], products: [], labor: [], services: [] };

async function load() {
  const { data, error } = await supabase.from("app_data").select("data").eq("id", "main").single();
  if (error) { console.error("load", error); return null; }
  return data?.data || null;
}
let saveTimer;
function persist(db) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await supabase.from("app_data").update({ data: db, updated_at: new Date().toISOString() }).eq("id", "main");
    if (error) console.error("save", error);
  }, 700);
}

// ---------- PDF (orçamento) ----------
function gerarPDF(s, client) {
  const rows = s.items.map((i) => `<tr><td>${i.name}</td><td class="c">${i.qty}</td><td class="r">${brl(i.value)}</td><td class="r">${brl(i.value * i.qty)}</td></tr>`).join("");
  const travelRow = s.travel?.charged ? `<tr><td>Deslocamento</td><td class="c">1</td><td class="r">${brl(s.travel.value)}</td><td class="r">${brl(s.travel.value)}</td></tr>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento Hermes</title><style>
  *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;padding:40px;color:#171717}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #fbbf24;padding-bottom:16px;margin-bottom:24px}
  .logo{display:flex;align-items:center;gap:8px}.logo b{color:#f59e0b;font-size:18px}
  .badge{background:#fbbf24;color:#171717;padding:6px 14px;border-radius:8px;font-weight:bold;font-size:13px}
  h1{font-size:22px;margin:0 0 4px}.muted{color:#737373;font-size:12px}
  .box{background:#fafafa;border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:18px}
  .box h3{margin:0 0 8px;font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:.5px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
  th{background:#171717;color:#fff;text-align:left;padding:9px 10px;font-size:11px;text-transform:uppercase}
  td{padding:9px 10px;border-bottom:1px solid #eee}.c{text-align:center}.r{text-align:right}
  .total{display:flex;justify-content:flex-end;gap:30px;font-size:18px;font-weight:bold;padding:12px;background:#fffbeb;border-radius:8px}
  .total span:last-child{color:#f59e0b}
  .foot{margin-top:30px;font-size:11px;color:#a3a3a3;border-top:1px solid #eee;padding-top:12px}
  @page{size:A4;margin:0}
  </style></head><body>
  <div class="head"><div class="logo">💡 <b>Hermes — Instalações Elétricas e Iluminação Inteligente</b></div><div class="badge">ORÇAMENTO</div></div>
  <h1>Proposta de Serviço</h1><p class="muted">Emitido em ${brNow().toLocaleDateString("pt-BR")} · Válido por 15 dias</p>
  <div class="box"><h3>Cliente</h3><div class="grid"><div><b>${client?.name || "—"}</b></div><div>${client?.contact || ""}</div><div>${client?.address || ""}</div></div></div>
  <table><thead><tr><th>Descrição</th><th class="c">Qtd</th><th class="r">Unitário</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}${travelRow}</tbody></table>
  <div class="total"><span>TOTAL</span><span>${brl(s.total)}</span></div>
  <div class="box" style="margin-top:18px"><h3>Condições</h3><div class="grid"><div>Forma de pagamento: <b>${s.paymentMethod}</b></div><div>Data prevista: <b>${fmtD(s.scheduledDate)}</b></div><div>Duração: <b>${s.durType === "horas" ? s.durVal + "h" : s.durVal + " dia(s)"}</b></div></div></div>
  <div class="foot">Hermes — Instalações Elétricas e Iluminação Inteligente · Este documento é um orçamento e não possui valor fiscal. Valores sujeitos a alteração após o prazo de validade.</div>
  </body></html>`;
  const f = document.createElement("iframe");
  Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(f);
  f.srcdoc = html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.onafterprint = () => f.remove(); f.contentWindow.print(); } catch (e) { console.error(e); } setTimeout(() => { if (document.body.contains(f)) f.remove(); }, 30000); };
}

// ---------- LOGIN ----------
function Login() {
  const [e, setE] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const go = async () => {
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e.trim().toLowerCase(), password: p });
    setLoading(false);
    if (error) setErr("Login ou senha incorretos.");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
        <div className="flex items-center gap-2 mb-1"><div className="p-2 rounded-xl bg-amber-400/10"><Lightbulb className="text-amber-400" size={22} /></div><span className="text-amber-400 font-bold tracking-tight text-lg">Hermes</span></div>
        <p className="text-neutral-500 text-sm mb-6">Instalações Elétricas e Iluminação Inteligente</p>
        <input value={e} onChange={(ev) => setE(ev.target.value)} placeholder="E-mail" className="w-full mb-3 px-4 py-2.5 rounded-lg bg-neutral-800 text-white text-sm border border-neutral-700 outline-none focus:border-amber-400" />
        <input value={p} onChange={(ev) => setP(ev.target.value)} type="password" placeholder="Senha" onKeyDown={(k) => k.key === "Enter" && go()} className="w-full mb-2 px-4 py-2.5 rounded-lg bg-neutral-800 text-white text-sm border border-neutral-700 outline-none focus:border-amber-400" />
        {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
        <button onClick={go} disabled={loading} className="w-full mt-2 py-2.5 rounded-lg bg-amber-400 text-neutral-900 font-semibold text-sm hover:bg-amber-300 disabled:opacity-60">{loading ? "Entrando…" : "Entrar"}</button>
      </div>
    </div>
  );
}

// ---------- UI helpers ----------
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white"><h3 className="font-semibold text-neutral-900">{title}</h3><button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
const Field = ({ label, children }) => (<label className="block mb-3"><span className="text-xs font-medium text-neutral-500 mb-1 block">{label}</span>{children}</label>);
const inp = "w-full px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-amber-400";
const btn = "px-4 py-2 rounded-lg bg-amber-400 text-neutral-900 font-semibold text-sm hover:bg-amber-300";
const Card = ({ icon: I, label, value, tone }) => (
  <div className="bg-white rounded-xl border border-neutral-100 p-4">
    <div className="flex items-center gap-2 text-neutral-400 mb-2"><I size={15} /><span className="text-xs font-medium">{label}</span></div>
    <p className={`text-2xl font-bold ${tone || "text-neutral-900"}`}>{value}</p>
  </div>
);

// ---------- MAIN ----------
export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [db, setDb] = useState(null);
  const [tab, setTab] = useState("dash");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) load().then((d) => setDb(d || empty)); else setDb(null); }, [session]);
  useEffect(() => { if (db && session) persist(db); }, [db]);

  const Splash = () => <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-neutral-400">Carregando…</div>;
  if (booting) return <Splash />;
  if (!session) return <Login />;
  if (!db) return <Splash />;

  const upd = (fn) => setDb((p) => ({ ...p, ...fn(p) }));
  const remaining = (s) => (s.total || 0) - (s.paidAmount || 0);
  const clientRemaining = (cid) => db.services.filter((s) => s.clientId === cid).reduce((a, s) => a + Math.max(0, remaining(s)), 0);
  const clientDot = (cid) => { const sv = db.services.filter((s) => s.clientId === cid); if (!sv.length) return "gray"; return clientRemaining(cid) > 0 ? "red" : "green"; };
  const cName = (id) => db.clients.find((c) => c.id === id)?.name || "—";

  const nav = [["dash", "Dashboard", LayoutDashboard], ["cli", "Clientes", Users], ["svc", "Serviços", Wrench], ["cal", "Calendário", Cal], ["fin", "Financeiro", DollarSign], ["prod", "Produtos", Package]];

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-56 bg-neutral-950 text-neutral-300 flex flex-col py-5 px-3 shrink-0">
        <div className="flex items-center gap-2 px-2 mb-7"><div className="p-1.5 rounded-lg bg-amber-400/10"><Lightbulb className="text-amber-400" size={18} /></div><span className="text-amber-400 font-bold text-sm tracking-tight">Hermes</span></div>
        {nav.map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition ${tab === k ? "bg-amber-400 text-neutral-900 font-semibold" : "hover:bg-neutral-800"}`}><I size={17} />{l}</button>
        ))}
        <button onClick={() => supabase.auth.signOut()} className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:bg-neutral-800"><LogOut size={17} />Sair</button>
      </aside>
      <main className="flex-1 p-6 overflow-x-hidden">
        {tab === "dash" && <Dash db={db} remaining={remaining} cName={cName} clientDot={clientDot} setTab={setTab} />}
        {tab === "cli" && <Clients db={db} upd={upd} clientDot={clientDot} clientRemaining={clientRemaining} />}
        {tab === "svc" && <Services db={db} upd={upd} cName={cName} remaining={remaining} />}
        {tab === "cal" && <CalView db={db} upd={upd} cName={cName} />}
        {tab === "fin" && <Finance db={db} upd={upd} remaining={remaining} cName={cName} />}
        {tab === "prod" && <Products db={db} upd={upd} />}
      </main>
    </div>
  );
}

// ---------- DASHBOARD ----------
function Dash({ db, remaining, cName, clientDot, setTab }) {
  const [ws, we] = weekRange();
  const weekSvc = db.services.filter((s) => s.scheduledDate >= ws && s.scheduledDate <= we);
  const weekTotal = weekSvc.reduce((a, s) => a + (s.total || 0), 0);
  const pending = db.services.filter((s) => remaining(s) > 0);
  const todo = db.services.filter((s) => s.status !== "concluido");
  const toReceive = pending.reduce((a, s) => a + remaining(s), 0);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-neutral-400 text-sm mb-5">Visão geral — {brNow().toLocaleDateString("pt-BR")} · Horário de Brasília</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card icon={Users} label="Clientes" value={db.clients.length} />
        <Card icon={Wrench} label="Serviços na semana" value={brl(weekTotal)} tone="text-amber-500" />
        <Card icon={AlertCircle} label="Pendentes de pagto" value={pending.length} tone="text-red-500" />
        <Card icon={DollarSign} label="A receber" value={brl(toReceive)} tone="text-red-500" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm">Tarefas a concluir</h3><span className="text-xs text-neutral-400">{todo.length}</span></div>
          {todo.length === 0 && <p className="text-sm text-neutral-400">Tudo concluído ✨</p>}
          <div className="space-y-2">{todo.map((s) => (
            <div key={s.id} onClick={() => setTab("svc")} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 cursor-pointer hover:bg-neutral-100">
              <div><p className="text-sm font-medium">{cName(s.clientId)}</p><p className="text-xs text-neutral-400">{s.items.map((i) => i.name).join(", ") || "Serviço"} · {fmtD(s.scheduledDate)}</p></div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{s.status === "agendado" ? "Agendado" : "Em andamento"}</span>
            </div>))}</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <h3 className="font-semibold text-sm mb-3">Clientes — status de pagamento</h3>
          <div className="space-y-2">{db.clients.map((c) => { const d = clientDot(c.id); return (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
              <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${d === "red" ? "bg-red-500" : d === "green" ? "bg-emerald-500" : "bg-neutral-300"}`} /><span className="text-sm">{c.name}</span></div>
            </div>); })}{db.clients.length === 0 && <p className="text-sm text-neutral-400">Nenhum cliente ainda.</p>}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- CLIENTES ----------
function Clients({ db, upd, clientDot, clientRemaining }) {
  const [modal, setModal] = useState(false); const [editId, setEditId] = useState(null); const [detail, setDetail] = useState(null);
  const [f, setF] = useState({ name: "", contact: "", address: "", obs: "" });
  const openNew = () => { setEditId(null); setF({ name: "", contact: "", address: "", obs: "" }); setModal(true); };
  const openEdit = (c) => { setEditId(c.id); setF({ name: c.name, contact: c.contact || "", address: c.address || "", obs: "" }); setModal(true); };
  const save = () => {
    if (!f.name) return;
    if (editId) upd((p) => ({ clients: p.clients.map((x) => x.id === editId ? { ...x, name: f.name, contact: f.contact, address: f.address } : x) }));
    else upd((p) => ({ clients: [...p.clients, { id: uid(), name: f.name, contact: f.contact, address: f.address, notes: f.obs ? [{ id: uid(), text: f.obs, date: iso(brNow()) }] : [] }] }));
    setModal(false); setEditId(null);
  };
  const delClient = (id) => { if (!window.confirm("Excluir este cliente e TODOS os serviços dele? Esta ação não pode ser desfeita.")) return; upd((p) => ({ clients: p.clients.filter((x) => x.id !== id), services: p.services.filter((s) => s.clientId !== id) })); };
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-bold">Clientes</h1><button onClick={openNew} className={btn}><Plus size={16} className="inline mr-1" />Novo cliente</button></div>
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {db.clients.length === 0 && <p className="p-5 text-sm text-neutral-400">Nenhum cliente cadastrado.</p>}
        {db.clients.map((c) => { const rem = clientRemaining(c.id); const d = clientDot(c.id); return (
          <div key={c.id} onClick={() => setDetail(c.id)} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50">
            <div className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${d === "red" ? "bg-red-500" : d === "green" ? "bg-emerald-500" : "bg-neutral-300"}`} /><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-neutral-400">{c.contact || "sem contato"} · {c.address || "sem endereço"}</p></div></div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {rem > 0 ? <span className="text-sm font-semibold text-red-500">{brl(rem)}</span> : <span className="text-xs text-emerald-500 font-medium">Em dia</span>}
              <button onClick={() => openEdit(c)} className="text-neutral-400 hover:text-amber-500"><Pencil size={15} /></button>
              <button onClick={() => delClient(c.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          </div>); })}
      </div>
      {modal && <Modal title={editId ? "Editar cliente" : "Novo cliente"} onClose={() => { setModal(false); setEditId(null); }}>
        <Field label="Nome *"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Contato"><input className={inp} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="Telefone / WhatsApp" /></Field>
        <Field label="Endereço"><input className={inp} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        {!editId && <Field label="Observação"><textarea className={inp} rows={2} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Field>}
        <button onClick={save} className={btn + " w-full mt-1"}>{editId ? "Salvar alterações" : "Salvar cliente"}</button>
      </Modal>}
      {detail && <ClientDetail db={db} upd={upd} id={detail} onClose={() => setDetail(null)} clientRemaining={clientRemaining} />}
    </div>
  );
}
function ClientDetail({ db, upd, id, onClose, clientRemaining }) {
  const c = db.clients.find((x) => x.id === id); const [note, setNote] = useState("");
  const addNote = () => { if (!note.trim()) return; upd((p) => ({ clients: p.clients.map((x) => x.id === id ? { ...x, notes: [...(x.notes || []), { id: uid(), text: note, date: iso(brNow()) }] } : x) })); setNote(""); };
  const delNote = (nid) => upd((p) => ({ clients: p.clients.map((x) => x.id === id ? { ...x, notes: x.notes.filter((n) => n.id !== nid) } : x) }));
  const svc = db.services.filter((s) => s.clientId === id); const rem = clientRemaining(id);
  return (
    <Modal title={c.name} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Contato</p><p className="font-medium">{c.contact || "—"}</p></div>
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Endereço</p><p className="font-medium">{c.address || "—"}</p></div>
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Saldo devedor</p><p className={`font-semibold ${rem > 0 ? "text-red-500" : "text-emerald-500"}`}>{brl(rem)}</p></div>
      </div>
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><StickyNote size={15} />Bloco de notas rápidas</h4>
        <div className="space-y-2 mb-2">{(c.notes || []).map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
            <div><p className="text-sm text-neutral-800">{n.text}</p><p className="text-[10px] text-neutral-400 mt-0.5">{fmtD(n.date)}</p></div>
            <button onClick={() => delNote(n.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={14} /></button>
          </div>))}{(!c.notes || !c.notes.length) && <p className="text-xs text-neutral-400">Sem notas.</p>}</div>
        <div className="flex gap-2"><input className={inp} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(k) => k.key === "Enter" && addNote()} placeholder="Adicionar nota / detalhe do serviço…" /><button onClick={addNote} className={btn}>+</button></div>
      </div>
      <h4 className="text-sm font-semibold mb-2">Serviços ({svc.length})</h4>
      <div className="space-y-1.5">{svc.map((s) => (
        <div key={s.id} className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 text-sm">
          <span>{s.items.map((i) => i.name).join(", ") || "Serviço"} · {fmtD(s.scheduledDate)}</span>
          <span className={s.status === "concluido" ? "text-emerald-500" : "text-amber-500"}>{brl(s.total)} {(s.total - (s.paidAmount || 0)) > 0 ? `· falta ${brl(s.total - (s.paidAmount || 0))}` : "· pago"}</span>
        </div>))}{!svc.length && <p className="text-xs text-neutral-400">Nenhum serviço.</p>}</div>
    </Modal>
  );
}

// ---------- SERVIÇOS ----------
function Services({ db, upd, cName, remaining }) {
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null); const [complete, setComplete] = useState(null);
  const openNew = () => { setEditing(null); setModal(true); };
  const openEdit = (s) => { setEditing(s); setModal(true); };
  const delService = (id) => { if (!window.confirm("Excluir este serviço?")) return; upd((p) => ({ services: p.services.filter((x) => x.id !== id) })); };
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-bold">Serviços & Orçamentos</h1><button onClick={openNew} className={btn}><Plus size={16} className="inline mr-1" />Novo serviço</button></div>
      <div className="space-y-2">
        {db.services.length === 0 && <p className="text-sm text-neutral-400">Nenhum serviço criado.</p>}
        {db.services.slice().reverse().map((s) => { const rem = remaining(s); const client = db.clients.find((c) => c.id === s.clientId); return (
          <div key={s.id} className="bg-white rounded-xl border border-neutral-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="font-semibold text-sm">{cName(s.clientId)}</p>{s.type === "orcamento" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Orçamento</span>}<span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "concluido" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>{s.status === "concluido" ? "Concluído" : s.status === "andamento" ? "Em andamento" : "Agendado"}</span></div>
                <p className="text-xs text-neutral-400 mt-1">{s.items.map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", ")}</p>
                <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2"><Clock size={11} />{fmtD(s.scheduledDate)} {s.scheduledTime || ""} {s.travel?.charged && <><Truck size={11} className="ml-1" />{brl(s.travel.value)}</>}</p>
                {s.observation && <p className="text-xs text-neutral-500 mt-1 italic">“{s.observation}”</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-500">{brl(s.total)}</p>
                {rem > 0 ? <p className="text-xs text-red-500">Falta {brl(rem)}</p> : s.status === "concluido" && <p className="text-xs text-emerald-500">Pago</p>}
                <p className="text-[10px] text-neutral-400">{s.paymentMethod}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => gerarPDF(s, client)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 flex items-center gap-1"><FileText size={13} />Gerar PDF</button>
              <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 flex items-center gap-1"><Pencil size={13} />Editar</button>
              <button onClick={() => delService(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 flex items-center gap-1"><Trash2 size={13} />Excluir</button>
              {s.status !== "concluido" && <button onClick={() => setComplete(s)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700">Concluir / registrar pagamento</button>}
            </div>
          </div>); })}
      </div>
      {modal && <NewService db={db} upd={upd} editing={editing} onClose={() => { setModal(false); setEditing(null); }} />}
      {complete && <CompleteService s={complete} upd={upd} onClose={() => setComplete(null)} />}
    </div>
  );
}
function NewService({ db, upd, editing, onClose }) {
  const [type, setType] = useState(editing?.type || "servico");
  const [clientId, setClientId] = useState(editing?.clientId || ""); const [newCli, setNewCli] = useState(null);
  const [items, setItems] = useState(editing?.items ? [...editing.items] : []);
  const [src, setSrc] = useState("produto"); const [pick, setPick] = useState(""); const [qty, setQty] = useState(1); const [iv, setIv] = useState(""); const [mname, setMname] = useState("");
  const [travel, setTravel] = useState(editing?.travel?.charged || false); const [tval, setTval] = useState(editing?.travel?.value || "");
  const [date, setDate] = useState(editing?.scheduledDate || iso(brNow())); const [time, setTime] = useState(editing?.scheduledTime || "09:00");
  const [durType, setDurType] = useState(editing?.durType || "horas"); const [durVal, setDurVal] = useState(editing?.durVal || 2);
  const [pay, setPay] = useState(editing?.paymentMethod || PAY[0]);

  const addItem = () => {
    if (src === "produto") { const p = db.products.find((x) => x.id === pick); if (!p) return; setItems([...items, { type: "produto", refId: p.id, name: p.name, qty: +qty, value: +iv || 0 }]); }
    else if (src === "maoobra") { const m = db.labor.find((x) => x.id === pick); if (!m) return; setItems([...items, { type: "maoobra", refId: m.id, name: m.name, qty: 1, value: +iv || +m.value || 0 }]); }
    else { if (!mname) return; setItems([...items, { type: "manual", name: mname, qty: +qty, value: +iv || 0 }]); }
    setPick(""); setIv(""); setMname(""); setQty(1);
  };
  const itemsTotal = items.reduce((a, i) => a + i.value * i.qty, 0);
  const total = itemsTotal + (travel ? +tval || 0 : 0);
  const save = () => {
    let cid = clientId; let extra = {};
    if (newCli) { cid = uid(); extra = { clients: [...db.clients, { id: cid, name: newCli.name, contact: newCli.contact, address: newCli.address, notes: [] }] }; }
    if (!cid) return;
    if (editing) {
      upd((p) => ({ ...extra, services: p.services.map((x) => x.id === editing.id ? { ...x, type, clientId: cid, items, travel: { charged: travel, value: +tval || 0 }, scheduledDate: date, scheduledTime: time, durType, durVal: +durVal, total, paymentMethod: pay } : x) }));
    } else {
      const svc = { id: uid(), type, clientId: cid, items, travel: { charged: travel, value: +tval || 0 }, scheduledDate: date, scheduledTime: time, durType, durVal: +durVal, total, paymentMethod: pay, status: "agendado", paid: "nao", paidAmount: 0, observation: "" };
      upd((p) => ({ ...extra, services: [...p.services, svc] }));
    }
    onClose();
  };
  return (
    <Modal title={editing ? "Editar serviço" : "Novo serviço / orçamento"} onClose={onClose} wide>
      <div className="flex gap-2 mb-4">{["servico", "orcamento"].map((t) => <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${type === t ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-500"}`}>{t === "servico" ? "Serviço" : "Orçamento"}</button>)}</div>
      <Field label="Cliente">
        {!newCli ? <div className="flex gap-2"><select className={inp} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Selecione…</option>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={() => setNewCli({ name: "", contact: "", address: "" })} className="px-3 py-2 rounded-lg bg-neutral-100 text-sm whitespace-nowrap">+ Novo</button></div>
        : <div className="space-y-2 bg-neutral-50 p-3 rounded-lg"><div className="flex justify-between"><span className="text-xs font-medium text-neutral-500">Novo cliente</span><button onClick={() => setNewCli(null)} className="text-xs text-neutral-400">cancelar</button></div><input className={inp} placeholder="Nome" value={newCli.name} onChange={(e) => setNewCli({ ...newCli, name: e.target.value })} /><input className={inp} placeholder="Contato" value={newCli.contact} onChange={(e) => setNewCli({ ...newCli, contact: e.target.value })} /><input className={inp} placeholder="Endereço" value={newCli.address} onChange={(e) => setNewCli({ ...newCli, address: e.target.value })} /></div>}
      </Field>
      <div className="border border-neutral-200 rounded-lg p-3 mb-3">
        <p className="text-xs font-medium text-neutral-500 mb-2">Itens do serviço</p>
        <div className="space-y-1.5 mb-3">{items.map((i, x) => <div key={x} className="flex justify-between items-center text-sm bg-neutral-50 rounded px-2 py-1.5"><span>{i.name} {i.qty > 1 && `x${i.qty}`} <span className="text-[10px] text-neutral-400">({i.type})</span></span><span className="flex items-center gap-2">{brl(i.value * i.qty)}<button onClick={() => setItems(items.filter((_, j) => j !== x))} className="text-neutral-300 hover:text-red-400"><X size={13} /></button></span></div>)}{!items.length && <p className="text-xs text-neutral-400">Nenhum item.</p>}</div>
        <div className="grid grid-cols-2 gap-2">
          <select className={inp} value={src} onChange={(e) => { setSrc(e.target.value); setPick(""); setIv(""); }}><option value="produto">Produto</option><option value="maoobra">Mão de obra</option><option value="manual">Manual</option></select>
          {src === "produto" && <select className={inp} value={pick} onChange={(e) => { setPick(e.target.value); const p = db.products.find((x) => x.id === e.target.value); if (p) setIv(p.gross || ""); }}><option value="">Selecione produto…</option>{db.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          {src === "maoobra" && <select className={inp} value={pick} onChange={(e) => { setPick(e.target.value); const m = db.labor.find((x) => x.id === e.target.value); if (m) setIv(m.value || ""); }}><option value="">Selecione mão de obra…</option>{db.labor.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
          {src === "manual" && <input className={inp} placeholder="Descrição" value={mname} onChange={(e) => setMname(e.target.value)} />}
          {src !== "maoobra" && <input className={inp} type="number" placeholder="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} />}
          <input className={inp} type="number" placeholder="Valor R$" value={iv} onChange={(e) => setIv(e.target.value)} />
        </div>
        <button onClick={addItem} className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white">+ Adicionar item</button>
      </div>
      <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={travel} onChange={(e) => setTravel(e.target.checked)} /><span className="text-sm">Cobrar deslocamento</span>{travel && <input className={inp + " w-32 ml-2"} type="number" placeholder="Valor R$" value={tval} onChange={(e) => setTval(e.target.value)} />}</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data (vai para o calendário)"><input className={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Horário"><input className={inp} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Duração"><div className="flex gap-2"><input className={inp} type="number" value={durVal} onChange={(e) => setDurVal(e.target.value)} /><select className={inp} value={durType} onChange={(e) => setDurType(e.target.value)}><option value="horas">horas no dia</option><option value="dias">dias</option></select></div></Field>
        <Field label="Forma de pagamento"><select className={inp} value={pay} onChange={(e) => setPay(e.target.value)}>{PAY.map((p) => <option key={p}>{p}</option>)}</select></Field>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100"><span className="text-sm text-neutral-500">Total</span><span className="text-xl font-bold text-amber-500">{brl(total)}</span></div>
      <button onClick={save} className={btn + " w-full mt-3"}>{editing ? "Salvar alterações" : `Salvar ${type === "orcamento" ? "orçamento" : "serviço"}`}</button>
    </Modal>
  );
}
function CompleteService({ s, upd, onClose }) {
  const [paid, setPaid] = useState("total"); const [amount, setAmount] = useState(s.total); const [obs, setObs] = useState(s.observation || ""); const [pdate, setPdate] = useState(iso(brNow()));
  const save = () => { const pa = paid === "total" ? s.total : paid === "nao" ? 0 : +amount || 0; upd((p) => ({ services: p.services.map((x) => x.id === s.id ? { ...x, status: "concluido", paid, paidAmount: pa, paidDate: pdate, observation: obs } : x) })); onClose(); };
  return (
    <Modal title="Concluir serviço" onClose={onClose}>
      <p className="text-sm text-neutral-500 mb-3">Total do serviço: <strong className="text-neutral-900">{brl(s.total)}</strong></p>
      <Field label="Pagamento">
        <div className="flex gap-2">{[["total", "Pagou tudo"], ["parcial", "Parcial"], ["nao", "Não pagou"]].map(([k, l]) => <button key={k} onClick={() => setPaid(k)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${paid === k ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-500"}`}>{l}</button>)}</div>
      </Field>
      {paid === "parcial" && <Field label="Valor pago"><input className={inp} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
      {paid !== "nao" && <Field label="Data do pagamento"><input className={inp} type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} /></Field>}
      {paid !== "total" && <p className="text-xs text-red-500 mb-3">Saldo restante: {brl(s.total - (paid === "parcial" ? +amount || 0 : 0))} (aparece no cliente com bolinha vermelha)</p>}
      <Field label="Observação final"><textarea className={inp} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: instalado painel LED, cliente solicitou retorno…" /></Field>
      <button onClick={save} className={btn + " w-full"}><CheckCircle2 size={16} className="inline mr-1" />Finalizar tarefa</button>
    </Modal>
  );
}

// ---------- CALENDÁRIO ----------
function CalView({ db, upd, cName }) {
  const [ref, setRef] = useState(brNow()); const [daySel, setDaySel] = useState(null);
  const y = ref.getFullYear(), m = ref.getMonth();
  const first = new Date(y, m, 1); const start = (first.getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
  const today = iso(brNow());
  const cells = []; for (let i = 0; i < start; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
  const svcOn = (d) => db.services.filter((s) => s.scheduledDate === iso(new Date(y, m, d)));
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Calendário <span className="text-xs font-normal text-neutral-400 ml-1">Brasília</span></h1>
        <div className="flex items-center gap-2"><button onClick={() => setRef(new Date(y, m - 1, 1))} className="p-2 rounded-lg bg-white border border-neutral-100"><ChevronLeft size={16} /></button><span className="text-sm font-medium w-32 text-center capitalize">{ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span><button onClick={() => setRef(new Date(y, m + 1, 1))} className="p-2 rounded-lg bg-white border border-neutral-100"><ChevronRight size={16} /></button></div>
      </div>
      <div className="bg-white rounded-xl border border-neutral-100 p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="text-center text-[11px] font-medium text-neutral-400 py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = iso(new Date(y, m, d)); const sv = svcOn(d);
          return <button key={i} onClick={() => setDaySel(ds)} className={`min-h-[72px] rounded-lg p-1.5 text-left border ${ds === today ? "border-amber-400 bg-amber-50" : "border-neutral-100 hover:bg-neutral-50"}`}>
            <span className={`text-xs font-medium ${ds === today ? "text-amber-600" : "text-neutral-700"}`}>{d}</span>
            <div className="space-y-0.5 mt-1">{sv.slice(0, 2).map((s) => <div key={s.id} className={`text-[9px] truncate rounded px-1 py-0.5 ${s.status === "concluido" ? "bg-emerald-100 text-emerald-700" : "bg-amber-200 text-amber-800"}`}>{s.scheduledTime} {cName(s.clientId)}</div>)}{sv.length > 2 && <span className="text-[9px] text-neutral-400">+{sv.length - 2}</span>}</div>
          </button>;
        })}</div>
      </div>
      {daySel && <DayModal db={db} upd={upd} cName={cName} date={daySel} onClose={() => setDaySel(null)} />}
    </div>
  );
}
function DayModal({ db, upd, cName, date, onClose }) {
  const sv = db.services.filter((s) => s.scheduledDate === date);
  const [add, setAdd] = useState(false);
  const [clientId, setClientId] = useState(""); const [newCli, setNewCli] = useState(null);
  const [desc, setDesc] = useState(""); const [time, setTime] = useState("09:00"); const [durType, setDurType] = useState("horas"); const [durVal, setDurVal] = useState(2); const [val, setVal] = useState("");
  const save = () => {
    let cid = clientId, extra = {};
    if (newCli) { cid = uid(); extra = { clients: [...db.clients, { id: cid, name: newCli.name, contact: newCli.contact, address: newCli.address, notes: [] }] }; }
    if (!cid) return;
    const svc = { id: uid(), type: "servico", clientId: cid, items: desc ? [{ type: "manual", name: desc, qty: 1, value: +val || 0 }] : [], travel: { charged: false, value: 0 }, scheduledDate: date, scheduledTime: time, durType, durVal: +durVal, total: +val || 0, paymentMethod: PAY[0], status: "agendado", paid: "nao", paidAmount: 0, observation: "" };
    upd((p) => ({ ...extra, services: [...p.services, svc] })); onClose();
  };
  return (
    <Modal title={`Agenda · ${fmtD(date)}`} onClose={onClose}>
      <div className="space-y-2 mb-4">{sv.map((s) => <div key={s.id} className="p-2.5 rounded-lg bg-neutral-50 text-sm"><div className="flex justify-between"><span className="font-medium">{s.scheduledTime} · {cName(s.clientId)}</span><span className="text-amber-500">{brl(s.total)}</span></div><p className="text-xs text-neutral-400">{s.items.map((i) => i.name).join(", ") || "Serviço"} · {s.durType === "horas" ? `${s.durVal}h` : `${s.durVal} dia(s)`}</p></div>)}{!sv.length && <p className="text-sm text-neutral-400">Nada agendado neste dia.</p>}</div>
      {!add ? <button onClick={() => setAdd(true)} className={btn + " w-full"}><Plus size={16} className="inline mr-1" />Agendar serviço</button>
        : <div className="border-t border-neutral-100 pt-3">
          <Field label="Cliente">{!newCli ? <div className="flex gap-2"><select className={inp} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Selecione…</option>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={() => setNewCli({ name: "", contact: "", address: "" })} className="px-3 py-2 rounded-lg bg-neutral-100 text-sm whitespace-nowrap">+ Novo</button></div>
            : <div className="space-y-2 bg-neutral-50 p-3 rounded-lg"><input className={inp} placeholder="Nome" value={newCli.name} onChange={(e) => setNewCli({ ...newCli, name: e.target.value })} /><input className={inp} placeholder="Contato" value={newCli.contact} onChange={(e) => setNewCli({ ...newCli, contact: e.target.value })} /><button onClick={() => setNewCli(null)} className="text-xs text-neutral-400">cancelar novo</button></div>}</Field>
          <Field label="Descrição"><input className={inp} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Horário"><input className={inp} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Valor"><input className={inp} type="number" value={val} onChange={(e) => setVal(e.target.value)} /></Field>
          </div>
          <Field label="Duração"><div className="flex gap-2"><input className={inp} type="number" value={durVal} onChange={(e) => setDurVal(e.target.value)} /><select className={inp} value={durType} onChange={(e) => setDurType(e.target.value)}><option value="horas">horas no dia</option><option value="dias">dias</option></select></div></Field>
          <button onClick={save} className={btn + " w-full"}>Salvar agendamento</button>
        </div>}
    </Modal>
  );
}

// ---------- FINANCEIRO ----------
function Finance({ db, upd, remaining, cName }) {
  const [edit, setEdit] = useState(null);
  const [ws, we] = weekRange(); const n = brNow(); const monthPref = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  const today = iso(brNow());
  const weekSvc = db.services.filter((s) => s.scheduledDate >= ws && s.scheduledDate <= we);
  const weekTotal = weekSvc.reduce((a, s) => a + (s.total || 0), 0);
  const doneWeek = weekSvc.filter((s) => s.status === "concluido").reduce((a, s) => a + (s.total || 0), 0);
  const doneMonth = db.services.filter((s) => s.status === "concluido" && s.scheduledDate?.startsWith(monthPref)).reduce((a, s) => a + (s.total || 0), 0);
  const toPay = db.services.filter((s) => remaining(s) > 0);
  const toPayTotal = toPay.reduce((a, s) => a + remaining(s), 0);
  const paidSvc = db.services.filter((s) => s.status === "concluido" && remaining(s) <= 0);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Financeiro</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card icon={Wrench} label="Serviços na semana" value={brl(weekTotal)} tone="text-amber-500" />
        <Card icon={CheckCircle2} label="Concluído na semana" value={brl(doneWeek)} tone="text-emerald-500" />
        <Card icon={Cal} label="Concluído no mês" value={brl(doneMonth)} tone="text-emerald-500" />
        <Card icon={DollarSign} label="A cobrar" value={brl(toPayTotal)} tone="text-red-500" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <h3 className="font-semibold text-sm mb-3 text-red-500 flex items-center gap-1"><AlertCircle size={15} />Clientes a pagar ({toPay.length})</h3>
          <div className="space-y-1.5">{toPay.map((s) => { const overdue = s.scheduledDate < today && s.status === "concluido"; return (
            <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-red-50">
              <div><p className="font-medium">{cName(s.clientId)}</p><p className="text-[10px] text-neutral-400">{fmtD(s.scheduledDate)} {overdue ? "· INADIMPLENTE" : "· pendente"}</p></div>
              <div className="flex items-center gap-2"><span className="text-red-500 font-semibold">{brl(remaining(s))}</span><button onClick={() => setEdit(s)} className="text-neutral-400 hover:text-amber-500"><Pencil size={14} /></button></div>
            </div>); })}{!toPay.length && <p className="text-sm text-neutral-400">Ninguém devendo 🎉</p>}</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <h3 className="font-semibold text-sm mb-3 text-emerald-500 flex items-center gap-1"><CheckCircle2 size={15} />Clientes pagos ({paidSvc.length})</h3>
          <div className="space-y-1.5">{paidSvc.map((s) => (
            <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-emerald-50">
              <div><p className="font-medium">{cName(s.clientId)}</p><p className="text-[10px] text-neutral-400">Pago em {fmtD(s.paidDate)}</p></div>
              <div className="flex items-center gap-2"><span className="text-emerald-600 font-semibold">{brl(s.total)}</span><button onClick={() => setEdit(s)} className="text-neutral-400 hover:text-amber-500"><Pencil size={14} /></button></div>
            </div>))}{!paidSvc.length && <p className="text-sm text-neutral-400">Nenhum pagamento ainda.</p>}</div>
        </div>
      </div>
      {edit && <EditPayment s={edit} upd={upd} cName={cName} onClose={() => setEdit(null)} />}
    </div>
  );
}
function EditPayment({ s, upd, cName, onClose }) {
  const init = (s.paidAmount || 0) >= s.total && s.total > 0 ? "total" : (s.paidAmount || 0) > 0 ? "parcial" : "nao";
  const [paid, setPaid] = useState(init); const [amount, setAmount] = useState(s.paidAmount || 0); const [pdate, setPdate] = useState(s.paidDate || iso(brNow()));
  const newPaid = paid === "total" ? s.total : paid === "nao" ? 0 : +amount || 0;
  const rem = s.total - newPaid;
  const save = () => { upd((p) => ({ services: p.services.map((x) => x.id === s.id ? { ...x, paid, paidAmount: newPaid, paidDate: paid === "nao" ? null : pdate } : x) })); onClose(); };
  return (
    <Modal title={`Editar pagamento · ${cName(s.clientId)}`} onClose={onClose}>
      <p className="text-sm text-neutral-500 mb-3">Total do serviço: <strong className="text-neutral-900">{brl(s.total)}</strong></p>
      <Field label="Situação do pagamento">
        <div className="flex gap-2">{[["total", "Pagou cheio"], ["parcial", "Pagou parte"], ["nao", "Pendente"]].map(([k, l]) => <button key={k} onClick={() => setPaid(k)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${paid === k ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-500"}`}>{l}</button>)}</div>
      </Field>
      {paid === "parcial" && <Field label="Valor pago"><input className={inp} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
      {paid !== "nao" && <Field label="Data do pagamento"><input className={inp} type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} /></Field>}
      <div className={`p-3 rounded-lg mb-3 text-sm flex items-center justify-between ${rem > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
        <span className={rem > 0 ? "text-red-600" : "text-emerald-600"}>{rem > 0 ? `Pendente · falta ${brl(rem)}` : "Em dia ✓"}</span>
        <span className={`w-3 h-3 rounded-full ${rem > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
      </div>
      <button onClick={save} className={btn + " w-full"}>Atualizar</button>
    </Modal>
  );
}

// ---------- PRODUTOS ----------
function Products({ db, upd }) {
  const [tab, setTab] = useState("prod");
  const [pModal, setPModal] = useState(false); const [lModal, setLModal] = useState(false);
  const [pEdit, setPEdit] = useState(null); const [lEdit, setLEdit] = useState(null);
  const [pf, setPf] = useState({ name: "", category: "HS", subcategory: "", warranty: "Nenhuma", description: "", gross: "", net: "" });
  const [lf, setLf] = useState({ name: "", description: "", value: "" });
  const margin = (+pf.gross || 0) - (+pf.net || 0);
  const marginPct = (+pf.net > 0) ? (margin / +pf.net) * 100 : 0;

  const openNewP = () => { setPEdit(null); setPf({ name: "", category: "HS", subcategory: "", warranty: "Nenhuma", description: "", gross: "", net: "" }); setPModal(true); };
  const openEditP = (p) => { setPEdit(p.id); setPf({ name: p.name, category: p.category, subcategory: p.subcategory || "", warranty: p.warranty, description: p.description || "", gross: p.gross || "", net: p.net || "" }); setPModal(true); };
  const saveP = () => {
    if (!pf.name) return;
    if (pEdit) upd((d) => ({ products: d.products.map((x) => x.id === pEdit ? { ...x, ...pf, gross: +pf.gross || 0, net: +pf.net || 0 } : x) }));
    else upd((p) => ({ products: [...p.products, { id: uid(), ...pf, gross: +pf.gross || 0, net: +pf.net || 0 }] }));
    setPModal(false); setPEdit(null);
  };
  const delP = (id) => { if (!window.confirm("Excluir este produto?")) return; upd((d) => ({ products: d.products.filter((x) => x.id !== id) })); };

  const openNewL = () => { setLEdit(null); setLf({ name: "", description: "", value: "" }); setLModal(true); };
  const openEditL = (m) => { setLEdit(m.id); setLf({ name: m.name, description: m.description || "", value: m.value || "" }); setLModal(true); };
  const saveL = () => {
    if (!lf.name) return;
    if (lEdit) upd((d) => ({ labor: d.labor.map((x) => x.id === lEdit ? { ...x, ...lf, value: +lf.value || 0 } : x) }));
    else upd((p) => ({ labor: [...p.labor, { id: uid(), ...lf, value: +lf.value || 0 }] }));
    setLModal(false); setLEdit(null);
  };
  const delL = (id) => { if (!window.confirm("Excluir esta mão de obra?")) return; upd((d) => ({ labor: d.labor.filter((x) => x.id !== id) })); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Produtos & Mão de obra</h1>
        <button onClick={() => tab === "prod" ? openNewP() : openNewL()} className={btn}><Plus size={16} className="inline mr-1" />{tab === "prod" ? "Novo produto" : "Nova mão de obra"}</button>
      </div>
      <div className="flex gap-2 mb-4">{[["prod", "Produtos"], ["lab", "Mão de obra"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === k ? "bg-neutral-900 text-white" : "bg-white border border-neutral-100 text-neutral-500"}`}>{l}</button>)}</div>
      {tab === "prod" ? <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {db.products.map((p) => { const mg = (p.gross || 0) - (p.net || 0); return (
          <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0">
            <div><div className="flex items-center gap-2"><p className="font-medium text-sm">{p.name}</p><span className={`text-[10px] px-2 py-0.5 rounded-full ${p.category === "HS" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>{p.category === "HS" ? "Produto HS" : "Terceiro"}</span>{p.subcategory && <span className="text-[10px] text-neutral-400">{p.subcategory}</span>}</div><p className="text-xs text-neutral-400">{p.description}</p><p className="text-[11px] text-neutral-400 mt-0.5">Bruto {brl(p.gross)} · Líquido {brl(p.net)} · <span className={`font-semibold ${mg >= 0 ? "text-emerald-500" : "text-red-500"}`}>Margem {brl(mg)}</span></p></div>
            <div className="flex items-center gap-3"><span className="text-xs text-neutral-500">Garantia: {p.warranty}</span><button onClick={() => openEditP(p)} className="text-neutral-400 hover:text-amber-500"><Pencil size={15} /></button><button onClick={() => delP(p.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={15} /></button></div>
          </div>); })}{!db.products.length && <p className="p-5 text-sm text-neutral-400">Nenhum produto cadastrado.</p>}
      </div> : <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {db.labor.map((m) => <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0">
          <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-neutral-400">{m.description}</p></div>
          <div className="flex items-center gap-3"><span className="text-sm text-amber-500 font-semibold">{brl(m.value)}</span><button onClick={() => openEditL(m)} className="text-neutral-400 hover:text-amber-500"><Pencil size={15} /></button><button onClick={() => delL(m.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={15} /></button></div>
        </div>)}{!db.labor.length && <p className="p-5 text-sm text-neutral-400">Nenhuma mão de obra cadastrada.</p>}
      </div>}
      {pModal && <Modal title={pEdit ? "Editar produto" : "Novo produto"} onClose={() => { setPModal(false); setPEdit(null); }}>
        <Field label="Nome *"><input className={inp} value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><select className={inp} value={pf.category} onChange={(e) => setPf({ ...pf, category: e.target.value })}><option value="HS">Produto HS</option><option value="Terceiro">Terceiro</option></select></Field>
          <Field label="Subcategoria"><input className={inp} value={pf.subcategory} onChange={(e) => setPf({ ...pf, subcategory: e.target.value })} placeholder="Ex: LED, Sensor…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor bruto (venda)"><input className={inp} type="number" value={pf.gross} onChange={(e) => setPf({ ...pf, gross: e.target.value })} placeholder="R$ cobrado" /></Field>
          <Field label="Valor líquido (custo)"><input className={inp} type="number" value={pf.net} onChange={(e) => setPf({ ...pf, net: e.target.value })} placeholder="R$ de custo" /></Field>
        </div>
        <div className={`flex items-center justify-between p-3 rounded-lg mb-3 ${margin >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
          <span className="text-sm flex items-center gap-1.5"><TrendingUp size={15} className={margin >= 0 ? "text-emerald-500" : "text-red-500"} />Margem de ganho</span>
          <span className={`font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{brl(margin)} {marginPct ? `(${marginPct.toFixed(0)}%)` : ""}</span>
        </div>
        <Field label="Garantia"><select className={inp} value={pf.warranty} onChange={(e) => setPf({ ...pf, warranty: e.target.value })}>{WAR.map((w) => <option key={w}>{w}</option>)}</select></Field>
        <Field label="Descrição"><textarea className={inp} rows={2} value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} /></Field>
        <button onClick={saveP} className={btn + " w-full"}>{pEdit ? "Salvar alterações" : "Salvar produto"}</button>
      </Modal>}
      {lModal && <Modal title={lEdit ? "Editar mão de obra" : "Nova mão de obra"} onClose={() => { setLModal(false); setLEdit(null); }}>
        <Field label="Nome *"><input className={inp} value={lf.name} onChange={(e) => setLf({ ...lf, name: e.target.value })} placeholder="Ex: Instalação de painel" /></Field>
        <Field label="Valor padrão"><input className={inp} type="number" value={lf.value} onChange={(e) => setLf({ ...lf, value: e.target.value })} /></Field>
        <Field label="Descrição"><textarea className={inp} rows={2} value={lf.description} onChange={(e) => setLf({ ...lf, description: e.target.value })} /></Field>
        <button onClick={saveL} className={btn + " w-full"}>{lEdit ? "Salvar alterações" : "Salvar mão de obra"}</button>
      </Modal>}
    </div>
  );
}