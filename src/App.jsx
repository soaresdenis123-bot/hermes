import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Wrench, Calendar as Cal, DollarSign, Package, Plus, X, Lightbulb, LogOut, Trash2, Clock, ChevronLeft, ChevronRight, StickyNote, CheckCircle2, AlertCircle, Truck, FileText, Pencil, TrendingUp, Inbox, Link2, Copy, Minus, Send, ShoppingCart } from "lucide-react";
import { supabase } from "./supabaseClient";

const TZ = "America/Sao_Paulo";
const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/catalog`;
const imgUrl = (item) => item?.image || (item?.id ? `${STORAGE_BASE}/${item.id}.png` : null);
const PAY = ["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto"];
const WAR = ["Nenhuma", "6 meses", "1 ano"];
const SUBCATS = { iluminacao: ["Iluminação Interna", "Iluminação Externa"], eletrica: ["Infraestrutura", "Disjuntores e Proteção", "Cabos e Condutores", "Eletrodutos e Caixas"] };
const ICON_KEYS = ["plafon", "spot", "trilho", "fita-led", "perfil", "driver", "pendente", "lustre", "painel", "lampada", "sensor", "arandela", "spot-jardim", "balizador", "refletor", "poste", "tomada", "interruptor", "fita-isolante", "quadro", "disjuntor", "dps", "cabo", "eletroduto", "caixa"];

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => Math.random().toString(36).slice(2, 10);
const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtD = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const fmtDT = (s) => { try { return new Date(s).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };
function weekRange() { const n = brNow(); const day = (n.getDay() + 6) % 7; const mon = new Date(n); mon.setDate(n.getDate() - day); mon.setHours(0, 0, 0, 0); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59); return [iso(mon), iso(sun)]; }

const empty = { clients: [], products: [], labor: [], services: [] };

// ---------- Dados: blob (app_data) ----------
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
// ---------- Dados: catálogo ----------
async function loadCatalog() { const { data, error } = await supabase.from("catalog").select("*").order("category").order("sort"); if (error) { console.error(error); return []; } return data || []; }
async function saveCatalogItem(id, patch) { const { error } = await supabase.from("catalog").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id); if (error) console.error(error); }
async function insertCatalogItem(item) { const { error } = await supabase.from("catalog").insert(item); if (error) console.error(error); }
async function deleteCatalogItem(id) { const { error } = await supabase.from("catalog").delete().eq("id", id); if (error) console.error(error); }
// ---------- Dados: solicitações ----------
async function loadRequests() { const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false }); if (error) { console.error(error); return []; } return data || []; }
async function updateRequest(id, patch) { const { error } = await supabase.from("requests").update(patch).eq("id", id); if (error) console.error(error); }
async function deleteRequest(id) { const { error } = await supabase.from("requests").delete().eq("id", id); if (error) console.error(error); }
// ---------- Dados: público ----------
async function loadPublicCatalog() { const { data, error } = await supabase.from("catalog_public").select("*").order("category").order("sort"); if (error) { console.error(error); return []; } return data || []; }
async function submitRequest(payload) { const { error } = await supabase.from("requests").insert(payload); return error; }
async function uploadImage(id, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${id}.${ext}`;
  const { error } = await supabase.storage.from("catalog").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) { console.error("upload", error); alert("Erro ao enviar a foto. Tente novamente."); return null; }
  const { data } = supabase.storage.from("catalog").getPublicUrl(path);
  return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
}

// ---------- Ícones dos produtos (SVG próprios) ----------
function ProductIcon({ icon, size = 22 }) {
  const map = { plafon: "ceiling", painel: "ceiling", spot: "spot", "spot-jardim": "spot", trilho: "track", "fita-led": "strip", perfil: "channel", driver: "box", caixa: "box", quadro: "panel", pendente: "pendant", lustre: "pendant", lampada: "bulb", sensor: "sensor", arandela: "wall", balizador: "wall", poste: "wall", refletor: "flood", tomada: "socket", interruptor: "switch", disjuntor: "switch", dps: "switch", "fita-isolante": "roll", cabo: "cable", eletroduto: "tube" };
  const k = map[icon] || "box";
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  const P = {
    bulb: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10c.7.7 1 1.5 1 2h6c0-.5.3-1.3 1-2a6 6 0 0 0-4-10Z" /></>,
    ceiling: <><circle cx="12" cy="13" r="6" /><path d="M12 3v3" /></>,
    spot: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></>,
    track: <><path d="M3 7h18" /><circle cx="7" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="17" cy="12" r="1.3" /></>,
    strip: <><path d="M3 12h18" /><path d="M6 12v2.5" /><path d="M10 12v2.5" /><path d="M14 12v2.5" /><path d="M18 12v2.5" /></>,
    channel: <><path d="M6 4v16" /><path d="M6 20h12" /></>,
    box: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M4 10h16" /></>,
    panel: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></>,
    pendant: <><path d="M12 3v6" /><path d="M7 15a5 5 0 0 0 10 0Z" /></>,
    sensor: <><circle cx="12" cy="12" r="2" /><path d="M8 8a5.6 5.6 0 0 0 0 8" /><path d="M16 8a5.6 5.6 0 0 1 0 8" /></>,
    wall: <><path d="M5 4v16" /><path d="M5 9a5 5 0 0 1 8 4" /></>,
    flood: <><path d="M7 5h10l-2 6H9Z" /><path d="M12 11v8" /><path d="M9 19h6" /></>,
    socket: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9.5" cy="12" r="1.1" /><circle cx="14.5" cy="12" r="1.1" /></>,
    switch: <><rect x="6" y="4" width="12" height="16" rx="2" /><rect x="9" y="8" width="6" height="4" rx="1" /></>,
    roll: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /></>,
    cable: <><path d="M4 7c4 0 4 10 8 10s4-10 8-10" /></>,
    tube: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6" /><path d="M13 9v6" /></>,
  };
  return <svg {...common}>{P[k]}</svg>;
}
function ProdImg({ item, size = 40, fill = false, onClick }) {
  const srcs = [];
  if (item?.image) srcs.push(item.image);
  if (item?.id) srcs.push(`${STORAGE_BASE}/${item.id}.png`);
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [item?.id, item?.image]);
  if (i >= srcs.length) return <ProductIcon icon={item?.icon} size={fill ? 48 : Math.round(size * 0.78)} />;
  const style = fill ? { width: "100%", height: "100%", objectFit: "contain" } : { width: size, height: size, objectFit: "contain" };
  return <img src={srcs[i]} alt="" onClick={onClick} onError={() => setI((n) => n + 1)} style={style} className={onClick ? "cursor-zoom-in" : ""} />;
}

// ---------- PDF (orçamento) ----------
function loadImg(src) { return new Promise((res) => { const img = new Image(); img.onload = () => { try { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); res({ dataUrl: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight }); } catch { res(null); } }; img.onerror = () => res(null); img.src = src; }); }
async function baixarPDF(s, client) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15; let y = 20;
  doc.setFillColor(251, 191, 36); doc.rect(0, 0, W, 3, "F");
  const logo = await loadImg("/hs-logo-light.png");
  if (logo) { const h = 13, w = h * (logo.w / logo.h); doc.addImage(logo.dataUrl, "PNG", M, y - 8, w, h); }
  else { doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(23, 23, 23); doc.text("HS Elétrica & Iluminação", M, y); }
  doc.setFillColor(251, 191, 36); doc.roundedRect(W - M - 34, y - 6, 34, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(23, 23, 23);
  doc.text("ORÇAMENTO", W - M - 30, y);
  doc.setDrawColor(251, 191, 36); doc.setLineWidth(0.8); doc.line(M, y + 9, W - M, y + 9);
  y += 18;
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(23, 23, 23);
  doc.text("Proposta de Serviço", M, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(115, 115, 115);
  doc.text(`Emitido em ${brNow().toLocaleDateString("pt-BR")}  ·  Válido por 15 dias`, M, y); y += 8;
  doc.setFillColor(250, 250, 250); doc.setDrawColor(230); doc.setLineWidth(0.2);
  doc.roundedRect(M, y, W - 2 * M, 20, 2, 2, "FD");
  doc.setFontSize(8); doc.setTextColor(115, 115, 115); doc.text("CLIENTE", M + 4, y + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(23, 23, 23);
  doc.text(client?.name || "—", M + 4, y + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text(`${client?.contact || ""}   ${client?.address || ""}`.trim(), M + 4, y + 16); y += 27;
  doc.setFillColor(23, 23, 23); doc.rect(M, y, W - 2 * M, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text("DESCRIÇÃO", M + 2, y + 5.3); doc.text("QTD", 125, y + 5.3, { align: "center" });
  doc.text("UNITÁRIO", 165, y + 5.3, { align: "right" }); doc.text("SUBTOTAL", W - M - 1, y + 5.3, { align: "right" }); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(23, 23, 23);
  const rows = [...s.items]; if (s.travel?.charged) rows.push({ name: "Deslocamento", qty: 1, value: s.travel.value });
  rows.forEach((i) => {
    doc.text(String(i.name).substring(0, 48), M + 2, y + 5);
    doc.text(String(i.qty), 125, y + 5, { align: "center" });
    doc.text(brl(i.value), 165, y + 5, { align: "right" });
    doc.text(brl(i.value * i.qty), W - M - 1, y + 5, { align: "right" });
    doc.setDrawColor(238); doc.line(M, y + 7, W - M, y + 7); y += 7;
  });
  y += 4; doc.setFillColor(255, 251, 235); doc.roundedRect(W - M - 75, y, 75, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(23, 23, 23); doc.text("TOTAL", W - M - 70, y + 8);
  doc.setTextColor(245, 158, 11); doc.setFontSize(13); doc.text(brl(s.total), W - M - 4, y + 8, { align: "right" }); y += 20;
  doc.setFillColor(250, 250, 250); doc.setDrawColor(230); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(115, 115, 115); doc.text("CONDIÇÕES", M + 4, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  doc.text(`Forma de pagamento: ${s.paymentMethod}`, M + 4, y + 11);
  doc.text(`Data prevista: ${fmtD(s.scheduledDate)}`, M + 4, y + 16);
  doc.text(`Duração: ${s.durType === "horas" ? s.durVal + "h" : s.durVal + " dia(s)"}`, M + 4, y + 21); y += 30;
  doc.setFontSize(7.5); doc.setTextColor(160, 160, 160);
  doc.text("HS Elétrica & Iluminação · Documento sem valor fiscal.", M, y);
  doc.save(`Orcamento-${(client?.name || "cliente").replace(/[^\w]/g, "_")}.pdf`);
}
function Quote({ s, client, onClose }) {
  const travel = s.travel?.charged;
  const gerar = async () => { try { await baixarPDF(s, client); } catch (e) { console.error(e); alert("Não consegui gerar o PDF neste dispositivo — você pode tirar um print desta tela."); } };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-neutral-900">Orçamento</h3>
          <div className="flex items-center gap-2"><button onClick={gerar} className={btn + " flex items-center gap-1"}><FileText size={15} />Baixar PDF</button><button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button></div>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center border-b-4 border-amber-400 pb-4 mb-5">
            <img src="/hs-logo-light.png" alt="HS Elétrica & Iluminação" className="h-11 w-auto" />
            <span className="bg-amber-400 text-neutral-900 font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 ml-2">ORÇAMENTO</span>
          </div>
          <h1 className="text-xl font-bold">Proposta de Serviço</h1>
          <p className="text-xs text-neutral-400 mb-4">Emitido em {brNow().toLocaleDateString("pt-BR")} · Válido por 15 dias</p>
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-4 mb-4">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Cliente</p>
            <p className="font-semibold">{client?.name || "—"}</p>
            <p className="text-sm text-neutral-500">{client?.contact}{client?.address ? ` · ${client.address}` : ""}</p>
          </div>
          <table className="w-full text-sm mb-4">
            <thead><tr className="bg-neutral-900 text-white text-[11px] uppercase"><th className="text-left px-2 py-2">Descrição</th><th className="px-2 py-2">Qtd</th><th className="text-right px-2 py-2">Unitário</th><th className="text-right px-2 py-2">Subtotal</th></tr></thead>
            <tbody>
              {s.items.map((i, x) => (<tr key={x} className="border-b border-neutral-100"><td className="px-2 py-2">{i.name}</td><td className="text-center px-2 py-2">{i.qty}</td><td className="text-right px-2 py-2">{brl(i.value)}</td><td className="text-right px-2 py-2">{brl(i.value * i.qty)}</td></tr>))}
              {travel && <tr className="border-b border-neutral-100"><td className="px-2 py-2">Deslocamento</td><td className="text-center px-2 py-2">1</td><td className="text-right px-2 py-2">{brl(s.travel.value)}</td><td className="text-right px-2 py-2">{brl(s.travel.value)}</td></tr>}
            </tbody>
          </table>
          <div className="flex justify-end mb-4"><div className="bg-amber-50 rounded-lg px-6 py-3 flex items-center gap-8"><span className="font-bold">TOTAL</span><span className="font-bold text-amber-500 text-lg">{brl(s.total)}</span></div></div>
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-4 text-sm grid grid-cols-2 gap-2">
            <div>Forma de pagamento: <b>{s.paymentMethod}</b></div><div>Data prevista: <b>{fmtD(s.scheduledDate)}</b></div><div>Duração: <b>{s.durType === "horas" ? s.durVal + "h" : s.durVal + " dia(s)"}</b></div>
          </div>
          <p className="text-[10px] text-neutral-400 mt-6 pt-3 border-t border-neutral-100">HS Elétrica & Iluminação · Documento sem valor fiscal.</p>
        </div>
      </div>
    </div>
  );
}

// ---------- LOGIN ----------
function Login() {
  const [e, setE] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const go = async () => { setErr(""); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email: e.trim().toLowerCase(), password: p }); setLoading(false); if (error) setErr("Login ou senha incorretos."); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
        <img src="/hs-logo-dark.png" alt="HS Elétrica & Iluminação" className="w-52 mx-auto mb-6" />
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
  <div className="bg-white rounded-xl border border-neutral-100 p-4"><div className="flex items-center gap-2 text-neutral-400 mb-2"><I size={15} /><span className="text-xs font-medium">{label}</span></div><p className={`text-2xl font-bold ${tone || "text-neutral-900"}`}>{value}</p></div>
);

// ========================================================
// ROTEADOR: /catalogo = página pública; resto = app com login
// ========================================================
export default function App() {
  const isPublic = window.location.pathname.replace(/\/+$/, "") === "/catalogo";
  if (isPublic) return <PublicCatalog />;
  return <AdminApp />;
}

// ---------- APP (admin, com login) ----------
function AdminApp() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [db, setDb] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("dash");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) { load().then((d) => setDb(d || empty)); loadCatalog().then(setCatalog); loadRequests().then(setRequests); } else setDb(null); }, [session]);
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
  const newReqs = requests.filter((r) => r.status === "novo").length;

  const nav = [["dash", "Dashboard", LayoutDashboard], ["cli", "Clientes", Users], ["svc", "Serviços", Wrench], ["cal", "Calendário", Cal], ["fin", "Financeiro", DollarSign], ["prod", "Produtos", Package], ["sol", "Solicitações", Inbox]];

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-56 bg-neutral-950 text-neutral-300 flex flex-col py-5 px-3 shrink-0">
        <div className="px-2 mb-7"><img src="/hs-logo-dark.png" alt="HS Elétrica & Iluminação" className="w-full" /></div>
        {nav.map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition ${tab === k ? "bg-amber-400 text-neutral-900 font-semibold" : "hover:bg-neutral-800"}`}><I size={17} /><span className="flex-1 text-left">{l}</span>{k === "sol" && newReqs > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{newReqs}</span>}</button>
        ))}
        <button onClick={() => supabase.auth.signOut()} className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:bg-neutral-800"><LogOut size={17} />Sair</button>
      </aside>
      <main className="flex-1 p-6 overflow-x-hidden">
        {tab === "dash" && <Dash db={db} remaining={remaining} cName={cName} clientDot={clientDot} setTab={setTab} newReqs={newReqs} />}
        {tab === "cli" && <Clients db={db} upd={upd} clientDot={clientDot} clientRemaining={clientRemaining} />}
        {tab === "svc" && <Services db={db} upd={upd} cName={cName} remaining={remaining} catalog={catalog} />}
        {tab === "cal" && <CalView db={db} upd={upd} cName={cName} />}
        {tab === "fin" && <Finance db={db} upd={upd} remaining={remaining} cName={cName} />}
        {tab === "prod" && <Produtos catalog={catalog} setCatalog={setCatalog} db={db} upd={upd} />}
        {tab === "sol" && <Solicitacoes requests={requests} setRequests={setRequests} catalog={catalog} db={db} upd={upd} />}
      </main>
    </div>
  );
}

// ---------- DASHBOARD ----------
function Dash({ db, remaining, cName, clientDot, setTab, newReqs }) {
  const [ws, we] = weekRange();
  const weekSvc = db.services.filter((s) => s.scheduledDate >= ws && s.scheduledDate <= we);
  const weekTotal = weekSvc.reduce((a, s) => a + (s.total || 0), 0);
  const pending = db.services.filter((s) => remaining(s) > 0);
  const todo = db.services.filter((s) => s.status !== "concluido");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-neutral-400 text-sm mb-5">Visão geral — {brNow().toLocaleDateString("pt-BR")} · Horário de Brasília</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card icon={Users} label="Clientes" value={db.clients.length} />
        <Card icon={Wrench} label="Serviços na semana" value={brl(weekTotal)} tone="text-amber-500" />
        <Card icon={AlertCircle} label="Pendentes de pagto" value={pending.length} tone="text-red-500" />
        <div onClick={() => setTab("sol")} className="cursor-pointer"><Card icon={Inbox} label="Novas solicitações" value={newReqs} tone={newReqs > 0 ? "text-red-500" : "text-neutral-900"} /></div>
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
          <div className="space-y-2">{db.clients.map((c) => { const d = clientDot(c.id); return (<div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50"><div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${d === "red" ? "bg-red-500" : d === "green" ? "bg-emerald-500" : "bg-neutral-300"}`} /><span className="text-sm">{c.name}</span></div></div>); })}{db.clients.length === 0 && <p className="text-sm text-neutral-400">Nenhum cliente ainda.</p>}</div>
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
  const save = () => { if (!f.name) return; if (editId) upd((p) => ({ clients: p.clients.map((x) => x.id === editId ? { ...x, name: f.name, contact: f.contact, address: f.address } : x) })); else upd((p) => ({ clients: [...p.clients, { id: uid(), name: f.name, contact: f.contact, address: f.address, notes: f.obs ? [{ id: uid(), text: f.obs, date: iso(brNow()) }] : [] }] })); setModal(false); setEditId(null); };
  const delClient = (id) => { if (!window.confirm("Excluir este cliente e TODOS os serviços dele?")) return; upd((p) => ({ clients: p.clients.filter((x) => x.id !== id), services: p.services.filter((s) => s.clientId !== id) })); };
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-bold">Clientes</h1><button onClick={openNew} className={btn}><Plus size={16} className="inline mr-1" />Novo cliente</button></div>
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {db.clients.length === 0 && <p className="p-5 text-sm text-neutral-400">Nenhum cliente cadastrado.</p>}
        {db.clients.map((c) => { const rem = clientRemaining(c.id); const d = clientDot(c.id); return (
          <div key={c.id} onClick={() => setDetail(c.id)} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50">
            <div className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${d === "red" ? "bg-red-500" : d === "green" ? "bg-emerald-500" : "bg-neutral-300"}`} /><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-neutral-400">{c.contact || "sem contato"} · {c.address || "sem endereço"}</p></div></div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>{rem > 0 ? <span className="text-sm font-semibold text-red-500">{brl(rem)}</span> : <span className="text-xs text-emerald-500 font-medium">Em dia</span>}<button onClick={() => openEdit(c)} className="text-neutral-400 hover:text-amber-500"><Pencil size={15} /></button><button onClick={() => delClient(c.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={15} /></button></div>
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
        <div className="space-y-2 mb-2">{(c.notes || []).map((n) => (<div key={n.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100"><div><p className="text-sm text-neutral-800">{n.text}</p><p className="text-[10px] text-neutral-400 mt-0.5">{fmtD(n.date)}</p></div><button onClick={() => delNote(n.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={14} /></button></div>))}{(!c.notes || !c.notes.length) && <p className="text-xs text-neutral-400">Sem notas.</p>}</div>
        <div className="flex gap-2"><input className={inp} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(k) => k.key === "Enter" && addNote()} placeholder="Adicionar nota…" /><button onClick={addNote} className={btn}>+</button></div>
      </div>
      <h4 className="text-sm font-semibold mb-2">Serviços ({svc.length})</h4>
      <div className="space-y-1.5">{svc.map((s) => (<div key={s.id} className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 text-sm"><span>{s.items.map((i) => i.name).join(", ") || "Serviço"} · {fmtD(s.scheduledDate)}</span><span className={s.status === "concluido" ? "text-emerald-500" : "text-amber-500"}>{brl(s.total)} {(s.total - (s.paidAmount || 0)) > 0 ? `· falta ${brl(s.total - (s.paidAmount || 0))}` : "· pago"}</span></div>))}{!svc.length && <p className="text-xs text-neutral-400">Nenhum serviço.</p>}</div>
    </Modal>
  );
}

// ---------- SERVIÇOS ----------
function Services({ db, upd, cName, remaining, catalog }) {
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null); const [complete, setComplete] = useState(null); const [quote, setQuote] = useState(null);
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
                <div className="flex items-center gap-2"><p className="font-semibold text-sm">{cName(s.clientId)}</p>{s.type === "orcamento" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Orçamento</span>}<span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "concluido" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>{s.status === "concluido" ? "Concluído" : "Agendado"}</span></div>
                <p className="text-xs text-neutral-400 mt-1">{s.items.map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", ")}</p>
                <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2"><Clock size={11} />{fmtD(s.scheduledDate)} {s.scheduledTime || ""} {s.travel?.charged && <><Truck size={11} className="ml-1" />{brl(s.travel.value)}</>}</p>
                {s.observation && <p className="text-xs text-neutral-500 mt-1 italic">“{s.observation}”</p>}
              </div>
              <div className="text-right"><p className="font-bold text-amber-500">{brl(s.total)}</p>{rem > 0 ? <p className="text-xs text-red-500">Falta {brl(rem)}</p> : s.status === "concluido" && <p className="text-xs text-emerald-500">Pago</p>}<p className="text-[10px] text-neutral-400">{s.paymentMethod}</p></div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => setQuote({ s, client })} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 flex items-center gap-1"><FileText size={13} />Orçamento PDF</button>
              <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 flex items-center gap-1"><Pencil size={13} />Editar</button>
              <button onClick={() => delService(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 flex items-center gap-1"><Trash2 size={13} />Excluir</button>
              {s.status !== "concluido" && <button onClick={() => setComplete(s)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700">Concluir / registrar pagamento</button>}
            </div>
          </div>); })}
      </div>
      {modal && <NewService db={db} upd={upd} editing={editing} catalog={catalog} onClose={() => { setModal(false); setEditing(null); }} />}
      {complete && <CompleteService s={complete} upd={upd} onClose={() => setComplete(null)} />}
      {quote && <Quote s={quote.s} client={quote.client} onClose={() => setQuote(null)} />}
    </div>
  );
}
function NewService({ db, upd, editing, catalog, onClose }) {
  const [type, setType] = useState(editing?.type || "servico");
  const [clientId, setClientId] = useState(editing?.clientId || ""); const [newCli, setNewCli] = useState(null);
  const [items, setItems] = useState(editing?.items ? [...editing.items] : []);
  const [src, setSrc] = useState("produto"); const [pick, setPick] = useState(""); const [qty, setQty] = useState(1); const [iv, setIv] = useState(""); const [mname, setMname] = useState("");
  const [travel, setTravel] = useState(editing?.travel?.charged || false); const [tval, setTval] = useState(editing?.travel?.value || "");
  const [date, setDate] = useState(editing?.scheduledDate || iso(brNow())); const [time, setTime] = useState(editing?.scheduledTime || "09:00");
  const [durType, setDurType] = useState(editing?.durType || "horas"); const [durVal, setDurVal] = useState(editing?.durVal || 2);
  const [pay, setPay] = useState(editing?.paymentMethod || PAY[0]);
  const addItem = () => {
    if (src === "produto") { const p = catalog.find((x) => x.id === pick); if (!p) return; setItems([...items, { type: "produto", refId: p.id, name: p.name, qty: +qty, value: +iv || 0 }]); }
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
    if (editing) upd((p) => ({ ...extra, services: p.services.map((x) => x.id === editing.id ? { ...x, type, clientId: cid, items, travel: { charged: travel, value: +tval || 0 }, scheduledDate: date, scheduledTime: time, durType, durVal: +durVal, total, paymentMethod: pay } : x) }));
    else { const svc = { id: uid(), type, clientId: cid, items, travel: { charged: travel, value: +tval || 0 }, scheduledDate: date, scheduledTime: time, durType, durVal: +durVal, total, paymentMethod: pay, status: "agendado", paid: "nao", paidAmount: 0, observation: "" }; upd((p) => ({ ...extra, services: [...p.services, svc] })); }
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
          <select className={inp} value={src} onChange={(e) => { setSrc(e.target.value); setPick(""); setIv(""); }}><option value="produto">Produto (catálogo)</option><option value="maoobra">Mão de obra</option><option value="manual">Manual</option></select>
          {src === "produto" && <select className={inp} value={pick} onChange={(e) => { setPick(e.target.value); const p = catalog.find((x) => x.id === e.target.value); if (p) setIv(p.price || ""); }}><option value="">Selecione produto…</option>{catalog.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
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
      <Field label="Pagamento"><div className="flex gap-2">{[["total", "Pagou tudo"], ["parcial", "Parcial"], ["nao", "Não pagou"]].map(([k, l]) => <button key={k} onClick={() => setPaid(k)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${paid === k ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-500"}`}>{l}</button>)}</div></Field>
      {paid === "parcial" && <Field label="Valor pago"><input className={inp} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
      {paid !== "nao" && <Field label="Data do pagamento"><input className={inp} type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} /></Field>}
      {paid !== "total" && <p className="text-xs text-red-500 mb-3">Saldo restante: {brl(s.total - (paid === "parcial" ? +amount || 0 : 0))}</p>}
      <Field label="Observação final"><textarea className={inp} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
      <button onClick={save} className={btn + " w-full"}><CheckCircle2 size={16} className="inline mr-1" />Finalizar tarefa</button>
    </Modal>
  );
}

// ---------- CALENDÁRIO ----------
function CalView({ db, upd, cName }) {
  const [ref, setRef] = useState(brNow()); const [daySel, setDaySel] = useState(null);
  const y = ref.getFullYear(), m = ref.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
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
          return <button key={i} onClick={() => setDaySel(ds)} className={`min-h-[72px] rounded-lg p-1.5 text-left border ${ds === today ? "border-amber-400 bg-amber-50" : "border-neutral-100 hover:bg-neutral-50"}`}><span className={`text-xs font-medium ${ds === today ? "text-amber-600" : "text-neutral-700"}`}>{d}</span><div className="space-y-0.5 mt-1">{sv.slice(0, 2).map((s) => <div key={s.id} className={`text-[9px] truncate rounded px-1 py-0.5 ${s.status === "concluido" ? "bg-emerald-100 text-emerald-700" : "bg-amber-200 text-amber-800"}`}>{s.scheduledTime} {cName(s.clientId)}</div>)}{sv.length > 2 && <span className="text-[9px] text-neutral-400">+{sv.length - 2}</span>}</div></button>;
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
          <div className="grid grid-cols-2 gap-2"><Field label="Horário"><input className={inp} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field><Field label="Valor"><input className={inp} type="number" value={val} onChange={(e) => setVal(e.target.value)} /></Field></div>
          <Field label="Duração"><div className="flex gap-2"><input className={inp} type="number" value={durVal} onChange={(e) => setDurVal(e.target.value)} /><select className={inp} value={durType} onChange={(e) => setDurType(e.target.value)}><option value="horas">horas no dia</option><option value="dias">dias</option></select></div></Field>
          <button onClick={save} className={btn + " w-full"}>Salvar agendamento</button>
        </div>}
    </Modal>
  );
}

// ---------- FINANCEIRO ----------
function Finance({ db, upd, remaining, cName }) {
  const [edit, setEdit] = useState(null);
  const [ws, we] = weekRange(); const n = brNow(); const monthPref = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; const today = iso(brNow());
  const weekSvc = db.services.filter((s) => s.scheduledDate >= ws && s.scheduledDate <= we);
  const weekTotal = weekSvc.reduce((a, s) => a + (s.total || 0), 0);
  const doneWeek = weekSvc.filter((s) => s.status === "concluido").reduce((a, s) => a + (s.total || 0), 0);
  const doneMonth = db.services.filter((s) => s.status === "concluido" && s.scheduledDate?.startsWith(monthPref)).reduce((a, s) => a + (s.total || 0), 0);
  const toPay = db.services.filter((s) => remaining(s) > 0); const toPayTotal = toPay.reduce((a, s) => a + remaining(s), 0);
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
          <div className="space-y-1.5">{toPay.map((s) => { const overdue = s.scheduledDate < today && s.status === "concluido"; return (<div key={s.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-red-50"><div><p className="font-medium">{cName(s.clientId)}</p><p className="text-[10px] text-neutral-400">{fmtD(s.scheduledDate)} {overdue ? "· INADIMPLENTE" : "· pendente"}</p></div><div className="flex items-center gap-2"><span className="text-red-500 font-semibold">{brl(remaining(s))}</span><button onClick={() => setEdit(s)} className="text-neutral-400 hover:text-amber-500"><Pencil size={14} /></button></div></div>); })}{!toPay.length && <p className="text-sm text-neutral-400">Ninguém devendo 🎉</p>}</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <h3 className="font-semibold text-sm mb-3 text-emerald-500 flex items-center gap-1"><CheckCircle2 size={15} />Clientes pagos ({paidSvc.length})</h3>
          <div className="space-y-1.5">{paidSvc.map((s) => (<div key={s.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-emerald-50"><div><p className="font-medium">{cName(s.clientId)}</p><p className="text-[10px] text-neutral-400">Pago em {fmtD(s.paidDate)}</p></div><div className="flex items-center gap-2"><span className="text-emerald-600 font-semibold">{brl(s.total)}</span><button onClick={() => setEdit(s)} className="text-neutral-400 hover:text-amber-500"><Pencil size={14} /></button></div></div>))}{!paidSvc.length && <p className="text-sm text-neutral-400">Nenhum pagamento ainda.</p>}</div>
        </div>
      </div>
      {edit && <EditPayment s={edit} upd={upd} cName={cName} onClose={() => setEdit(null)} />}
    </div>
  );
}
function EditPayment({ s, upd, cName, onClose }) {
  const init = (s.paidAmount || 0) >= s.total && s.total > 0 ? "total" : (s.paidAmount || 0) > 0 ? "parcial" : "nao";
  const [paid, setPaid] = useState(init); const [amount, setAmount] = useState(s.paidAmount || 0); const [pdate, setPdate] = useState(s.paidDate || iso(brNow()));
  const newPaid = paid === "total" ? s.total : paid === "nao" ? 0 : +amount || 0; const rem = s.total - newPaid;
  const save = () => { upd((p) => ({ services: p.services.map((x) => x.id === s.id ? { ...x, paid, paidAmount: newPaid, paidDate: paid === "nao" ? null : pdate } : x) })); onClose(); };
  return (
    <Modal title={`Editar pagamento · ${cName(s.clientId)}`} onClose={onClose}>
      <p className="text-sm text-neutral-500 mb-3">Total do serviço: <strong className="text-neutral-900">{brl(s.total)}</strong></p>
      <Field label="Situação do pagamento"><div className="flex gap-2">{[["total", "Pagou cheio"], ["parcial", "Pagou parte"], ["nao", "Pendente"]].map(([k, l]) => <button key={k} onClick={() => setPaid(k)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${paid === k ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-500"}`}>{l}</button>)}</div></Field>
      {paid === "parcial" && <Field label="Valor pago"><input className={inp} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
      {paid !== "nao" && <Field label="Data do pagamento"><input className={inp} type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} /></Field>}
      <div className={`p-3 rounded-lg mb-3 text-sm flex items-center justify-between ${rem > 0 ? "bg-red-50" : "bg-emerald-50"}`}><span className={rem > 0 ? "text-red-600" : "text-emerald-600"}>{rem > 0 ? `Pendente · falta ${brl(rem)}` : "Em dia ✓"}</span><span className={`w-3 h-3 rounded-full ${rem > 0 ? "bg-red-500" : "bg-emerald-500"}`} /></div>
      <button onClick={save} className={btn + " w-full"}>Atualizar</button>
    </Modal>
  );
}

// ---------- PRODUTOS (catálogo + mão de obra) ----------
function CatalogRow({ item, onSave, onEdit, onDelete, onUpload }) {
  const [cost, setCost] = useState(item.cost ?? 0); const [price, setPrice] = useState(item.price ?? 0); const [stock, setStock] = useState(item.stock ?? 0); const [up, setUp] = useState(false);
  useEffect(() => { setCost(item.cost ?? 0); setPrice(item.price ?? 0); setStock(item.stock ?? 0); }, [item.id, item.cost, item.price, item.stock]);
  const margin = (+price || 0) - (+cost || 0);
  const commit = () => onSave(item.id, { cost: +cost || 0, price: +price || 0, stock: +stock || 0 });
  const pick = async (e) => { const f = e.target.files[0]; if (!f) return; setUp(true); await onUpload(item.id, f); setUp(false); };
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-50 last:border-0">
      <label className="shrink-0 w-11 h-11 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-amber-500 overflow-hidden cursor-pointer hover:border-amber-400" title="Enviar foto">
        {up ? <span className="text-[9px] text-neutral-400">…</span> : <ProdImg item={item} size={40} />}
        <input type="file" accept="image/*" className="hidden" onChange={pick} />
      </label>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.name}</p><p className="text-[10px] text-neutral-400">{item.unit}</p></div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16"><span className="text-[9px] text-neutral-400 block">Estoque</span><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} onBlur={commit} className={`w-full px-2 py-1 rounded border text-xs outline-none focus:border-amber-400 ${(+stock || 0) <= 0 ? "bg-red-50 border-red-200 text-red-600 font-semibold" : "bg-neutral-50 border-neutral-200"}`} /></div>
        <div className="w-20"><span className="text-[9px] text-neutral-400 block">Custo</span><input type="number" value={cost} onChange={(e) => setCost(e.target.value)} onBlur={commit} className="w-full px-2 py-1 rounded bg-neutral-50 border border-neutral-200 text-xs outline-none focus:border-amber-400" /></div>
        <div className="w-20"><span className="text-[9px] text-neutral-400 block">Venda</span><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={commit} className="w-full px-2 py-1 rounded bg-neutral-50 border border-neutral-200 text-xs outline-none focus:border-amber-400" /></div>
        <div className="w-16 text-right"><span className="text-[9px] text-neutral-400 block">Margem</span><span className={`text-xs font-semibold ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>{brl(margin)}</span></div>
        <button onClick={() => onEdit(item)} className="text-neutral-300 hover:text-amber-500"><Pencil size={14} /></button>
        <button onClick={() => onDelete(item.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
function Produtos({ catalog, setCatalog, db, upd }) {
  const [tab, setTab] = useState("iluminacao");
  const [modal, setModal] = useState(false); const [editId, setEditId] = useState(null);
  const blank = { name: "", category: "iluminacao", subcategory: "Iluminação Interna", unit: "un", icon: "plafon", cost: 0, price: 0, stock: 0 };
  const [f, setF] = useState(blank);
  const [lModal, setLModal] = useState(false); const [lEdit, setLEdit] = useState(null); const [lf, setLf] = useState({ name: "", description: "", value: "" });

  const save = async (id, patch) => { setCatalog((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c)); await saveCatalogItem(id, patch); };
  const del = async (id) => { if (!window.confirm("Excluir este item do catálogo?")) return; setCatalog((cs) => cs.filter((c) => c.id !== id)); await deleteCatalogItem(id); };
  const upFoto = async (id, file) => { const url = await uploadImage(id, file); if (url) await save(id, { image: url }); };
  const openNew = () => { setEditId(null); setF({ ...blank, category: tab, subcategory: SUBCATS[tab][0] }); setModal(true); };
  const openEdit = (it) => { setEditId(it.id); setF({ name: it.name, category: it.category, subcategory: it.subcategory, unit: it.unit, icon: it.icon, cost: it.cost || 0, price: it.price || 0, stock: it.stock || 0 }); setModal(true); };
  const saveItem = async () => {
    if (!f.name) return;
    if (editId) { const patch = { ...f, cost: +f.cost || 0, price: +f.price || 0, stock: +f.stock || 0 }; setCatalog((cs) => cs.map((c) => c.id === editId ? { ...c, ...patch } : c)); await saveCatalogItem(editId, patch); }
    else { const maxSort = Math.max(0, ...catalog.filter((c) => c.category === f.category).map((c) => c.sort || 0)); const item = { id: "c" + uid(), ...f, cost: +f.cost || 0, price: +f.price || 0, stock: +f.stock || 0, sort: maxSort + 1, active: true }; setCatalog((cs) => [...cs, item]); await insertCatalogItem(item); }
    setModal(false); setEditId(null);
  };

  const openNewL = () => { setLEdit(null); setLf({ name: "", description: "", value: "" }); setLModal(true); };
  const openEditL = (m) => { setLEdit(m.id); setLf({ name: m.name, description: m.description || "", value: m.value || "" }); setLModal(true); };
  const saveL = () => { if (!lf.name) return; if (lEdit) upd((d) => ({ labor: d.labor.map((x) => x.id === lEdit ? { ...x, ...lf, value: +lf.value || 0 } : x) })); else upd((p) => ({ labor: [...p.labor, { id: uid(), ...lf, value: +lf.value || 0 }] })); setLModal(false); setLEdit(null); };
  const delL = (id) => { if (!window.confirm("Excluir esta mão de obra?")) return; upd((d) => ({ labor: d.labor.filter((x) => x.id !== id) })); };

  const catItems = catalog.filter((c) => c.category === tab);
  const subs = SUBCATS[tab] || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button onClick={() => tab === "labor" ? openNewL() : openNew()} className={btn}><Plus size={16} className="inline mr-1" />{tab === "labor" ? "Nova mão de obra" : "Novo item"}</button>
      </div>
      <div className="flex gap-2 mb-4">{[["iluminacao", "Iluminação"], ["eletrica", "Materiais Gerais"], ["labor", "Mão de obra"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === k ? "bg-neutral-900 text-white" : "bg-white border border-neutral-100 text-neutral-500"}`}>{l}</button>)}</div>

      {tab !== "labor" ? subs.map((sub) => {
        const rows = catItems.filter((c) => c.subcategory === sub);
        if (!rows.length) return null;
        return (
          <div key={sub} className="mb-4">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">{sub}</p>
            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">{rows.map((it) => <CatalogRow key={it.id} item={it} onSave={save} onEdit={openEdit} onDelete={del} onUpload={upFoto} />)}</div>
          </div>
        );
      }) : (
        <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
          {db.labor.map((m) => <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0"><div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-neutral-400">{m.description}</p></div><div className="flex items-center gap-3"><span className="text-sm text-amber-500 font-semibold">{brl(m.value)}</span><button onClick={() => openEditL(m)} className="text-neutral-400 hover:text-amber-500"><Pencil size={15} /></button><button onClick={() => delL(m.id)} className="text-neutral-300 hover:text-red-400"><Trash2 size={15} /></button></div></div>)}
          {!db.labor.length && <p className="p-5 text-sm text-neutral-400">Nenhuma mão de obra cadastrada.</p>}
        </div>
      )}

      {modal && <Modal title={editId ? "Editar item" : "Novo item do catálogo"} onClose={() => { setModal(false); setEditId(null); }}>
        <Field label="Nome *"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, subcategory: SUBCATS[e.target.value][0] })}><option value="iluminacao">Iluminação</option><option value="eletrica">Materiais Gerais</option></select></Field>
          <Field label="Subcategoria"><select className={inp} value={f.subcategory} onChange={(e) => setF({ ...f, subcategory: e.target.value })}>{SUBCATS[f.category].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Unidade"><select className={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{["un", "ml", "m", "rolo"].map((u) => <option key={u}>{u}</option>)}</select></Field>
          <Field label="Ícone"><select className={inp} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })}>{ICON_KEYS.map((i) => <option key={i}>{i}</option>)}</select></Field>
          <Field label="Custo (R$)"><input className={inp} type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
          <Field label="Venda (R$)"><input className={inp} type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <Field label="Estoque"><input className={inp} type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-2 mb-3 text-amber-500"><ProductIcon icon={f.icon} /><span className="text-xs text-neutral-400">prévia do ícone</span></div>
        <button onClick={saveItem} className={btn + " w-full"}>{editId ? "Salvar alterações" : "Salvar item"}</button>
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

// ---------- SOLICITAÇÕES ----------
function Solicitacoes({ requests, setRequests, catalog, db, upd }) {
  const [open, setOpen] = useState(null); const [copied, setCopied] = useState(false);
  const link = window.location.origin + "/catalogo";
  const copy = () => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copie o link:", link); } };
  const badge = (st) => st === "novo" ? "bg-red-100 text-red-600" : st === "orcado" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-600";
  const lbl = (st) => st === "novo" ? "Novo" : st === "orcado" ? "Orçado" : "Fechado";
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Solicitações de orçamento</h1>
      <p className="text-neutral-400 text-sm mb-4">Pedidos que chegaram pelo link do catálogo.</p>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 flex items-center gap-3">
        <Link2 size={16} className="text-amber-500 shrink-0" />
        <input readOnly value={link} className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-neutral-700 outline-none" />
        <button onClick={copy} className={btn + " flex items-center gap-1 shrink-0"}><Copy size={14} />{copied ? "Copiado!" : "Copiar link"}</button>
      </div>
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {requests.length === 0 && <p className="p-5 text-sm text-neutral-400">Nenhuma solicitação ainda. Envie o link acima para seus clientes.</p>}
        {requests.map((r) => (
          <div key={r.id} onClick={() => setOpen(r)} className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50">
            <div><div className="flex items-center gap-2"><p className="font-medium text-sm">{r.client_name}</p><span className={`text-[10px] px-2 py-0.5 rounded-full ${badge(r.status)}`}>{lbl(r.status)}</span></div><p className="text-xs text-neutral-400">{r.client_contact || "sem contato"} · {(r.items || []).length} itens · {fmtDT(r.created_at)}</p></div>
            <ChevronRight size={16} className="text-neutral-300" />
          </div>
        ))}
      </div>
      {open && <RequestDetail r={open} catalog={catalog} db={db} upd={upd} setRequests={setRequests} onClose={() => setOpen(null)} />}
    </div>
  );
}
function RequestDetail({ r, catalog, db, upd, setRequests, onClose }) {
  const priceOf = (id) => catalog.find((c) => c.id === id)?.price || 0;
  const [values, setValues] = useState(() => { const o = {}; (r.items || []).forEach((it) => o[it.id] = priceOf(it.id)); return o; });
  const total = (r.items || []).reduce((a, it) => a + (+values[it.id] || 0) * it.qty, 0);
  const criar = () => {
    const cid = uid();
    const client = { id: cid, name: r.client_name, contact: r.client_contact || "", address: r.client_address || "", notes: [] };
    const items = (r.items || []).map((it) => ({ type: "produto", refId: it.id, name: it.name, qty: it.qty, value: +values[it.id] || 0 }));
    const svc = { id: uid(), type: "orcamento", clientId: cid, items, travel: { charged: false, value: 0 }, scheduledDate: iso(brNow()), scheduledTime: "09:00", durType: "horas", durVal: 2, total, paymentMethod: PAY[0], status: "agendado", paid: "nao", paidAmount: 0, observation: "Gerado a partir de solicitação do catálogo" };
    upd((p) => ({ clients: [...p.clients, client], services: [...p.services, svc] }));
    updateRequest(r.id, { status: "orcado" });
    setRequests((rs) => rs.map((x) => x.id === r.id ? { ...x, status: "orcado" } : x));
    onClose();
    alert("Orçamento criado! Veja na aba Serviços — lá você pode gerar o PDF.");
  };
  const fechar = () => { updateRequest(r.id, { status: "fechado" }); setRequests((rs) => rs.map((x) => x.id === r.id ? { ...x, status: "fechado" } : x)); onClose(); };
  const del = () => { if (!window.confirm("Excluir esta solicitação?")) return; deleteRequest(r.id); setRequests((rs) => rs.filter((x) => x.id !== r.id)); onClose(); };
  return (
    <Modal title={`Solicitação · ${r.client_name}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Contato</p><p className="font-medium">{r.client_contact || "—"}</p></div>
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Endereço</p><p className="font-medium">{r.client_address || "—"}</p></div>
        <div className="bg-neutral-50 rounded-lg p-3"><p className="text-xs text-neutral-400">Recebido</p><p className="font-medium">{fmtDT(r.created_at)}</p></div>
      </div>
      <p className="text-sm font-semibold mb-2">Itens pedidos — defina o valor (vem do catálogo, pode ajustar)</p>
      <div className="space-y-1.5 mb-3">
        {(r.items || []).map((it) => (
          <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50">
            <div className="text-amber-500 shrink-0"><ProdImg item={catalog.find((c) => c.id === it.id)} size={26} /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{it.name}</p><p className="text-[10px] text-neutral-400">qtd {it.qty} {it.unit || ""}</p></div>
            <div className="w-24 shrink-0"><span className="text-[9px] text-neutral-400 block">Valor unit.</span><input type="number" value={values[it.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [it.id]: e.target.value }))} className="w-full px-2 py-1 rounded bg-white border border-neutral-200 text-xs outline-none focus:border-amber-400" /></div>
            <div className="w-20 text-right shrink-0 text-sm font-semibold text-neutral-700">{brl((+values[it.id] || 0) * it.qty)}</div>
          </div>
        ))}
        {!(r.items || []).length && <p className="text-xs text-neutral-400">Sem itens.</p>}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 mb-4"><span className="text-sm text-neutral-500">Total estimado</span><span className="text-xl font-bold text-amber-500">{brl(total)}</span></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={criar} className={btn + " flex items-center gap-1"}><FileText size={15} />Criar orçamento</button>
        <button onClick={fechar} className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 font-semibold text-sm hover:bg-neutral-200">Marcar fechado</button>
        <button onClick={del} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 flex items-center gap-1"><Trash2 size={15} />Excluir</button>
      </div>
    </Modal>
  );
}

// ========================================================
// PÁGINA PÚBLICA — /catalogo (sem login)
// ========================================================
function PubShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="bg-neutral-950 px-5 py-4"><img src="/hs-logo-dark.png" alt="HS Elétrica & Iluminação" className="h-10 w-auto" /></div>
      <div className="max-w-xl mx-auto p-4 pb-28">{children}</div>
    </div>
  );
}
function PublicCatalog() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", contact: "", address: "" });
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); const [sending, setSending] = useState(false); const [done, setDone] = useState(false); const [cat, setCat] = useState(null); const [zoom, setZoom] = useState(null);
  useEffect(() => { loadPublicCatalog().then((d) => { setItems(d); setLoading(false); }); }, []);
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id) => setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const submit = async () => {
    setSending(true);
    const chosen = items.filter((i) => cart[i.id]).map((i) => ({ id: i.id, name: i.name, category: i.category, subcategory: i.subcategory, unit: i.unit, qty: cart[i.id] }));
    const err = await submitRequest({ client_name: form.name, client_contact: form.contact, client_address: form.address, items: chosen, status: "novo" });
    setSending(false);
    if (!err) setDone(true); else alert("Erro ao enviar. Verifique a conexão e tente de novo.");
  };
  const catLabel = { iluminacao: "Iluminação", eletrica: "Materiais Gerais" };
  const visible = cat ? items.filter((i) => i.category === cat) : [];
  const groups = {};
  visible.forEach((i) => { const key = i.subcategory || i.category; (groups[key] = groups[key] || []).push(i); });
  const Bar = () => count > 0 ? (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm"><ShoppingCart size={18} className="text-amber-500" /><span className="font-semibold">{count} {count === 1 ? "item" : "itens"}</span></div>
        <button disabled={sending} onClick={submit} className={btn + " flex-1 flex items-center justify-center gap-1 disabled:opacity-60"}><Send size={15} />{sending ? "Enviando…" : "Enviar solicitação"}</button>
      </div>
    </div>
  ) : null;

  if (done) return <PubShell><div className="bg-white rounded-2xl border border-neutral-100 p-8 text-center mt-8"><div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="text-emerald-500" size={30} /></div><h2 className="text-xl font-bold mb-1">Solicitação enviada!</h2><p className="text-sm text-neutral-500">Obrigado, {form.name.split(" ")[0]}. Em breve entraremos em contato com seu orçamento.</p></div></PubShell>;

  if (step === 1) return (
    <PubShell>
      <h2 className="text-xl font-bold mt-4 mb-1">Monte seu pedido de iluminação</h2>
      <p className="text-sm text-neutral-500 mb-5">Primeiro, seus dados de contato. Depois você escolhe os itens para sua casa.</p>
      <div className="bg-white rounded-2xl border border-neutral-100 p-5">
        <Field label="Seu nome *"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="WhatsApp / Telefone *"><input className={inp} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="(00) 00000-0000" /></Field>
        <Field label="Endereço da obra (opcional)"><input className={inp} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <button disabled={!form.name || !form.contact} onClick={() => setStep(2)} className={btn + " w-full mt-1 disabled:opacity-50"}>Escolher produtos →</button>
      </div>
    </PubShell>
  );

  // Escolha de categoria (dois cards)
  if (!cat) return (
    <PubShell>
      <button onClick={() => setStep(1)} className="text-xs text-neutral-400 flex items-center gap-1 mt-2 mb-3"><ChevronLeft size={14} />voltar aos dados</button>
      <h2 className="text-lg font-bold mb-1">O que você procura?</h2>
      <p className="text-sm text-neutral-500 mb-4">Escolha uma categoria para ver os produtos.</p>
      <div className="grid grid-cols-1 gap-3">
        {["iluminacao", "eletrica"].map((c) => (
          <button key={c} onClick={() => setCat(c)} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4 text-left hover:border-amber-400 transition">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-500 shrink-0">{c === "iluminacao" ? <Lightbulb size={26} /> : <Package size={26} />}</div>
            <div className="flex-1"><p className="font-bold">{catLabel[c]}</p><p className="text-xs text-neutral-400">{items.filter((i) => i.category === c).length} itens</p></div>
            <ChevronRight className="text-neutral-300" size={20} />
          </button>
        ))}
      </div>
      <Bar />
    </PubShell>
  );

  // Produtos da categoria escolhida
  return (
    <PubShell>
      <button onClick={() => setCat(null)} className="text-xs text-neutral-400 flex items-center gap-1 mt-2 mb-3"><ChevronLeft size={14} />trocar categoria</button>
      <h2 className="text-lg font-bold mb-3">{catLabel[cat]}</h2>
      {loading ? <p className="text-sm text-neutral-400 text-center py-10">Carregando catálogo…</p> : Object.keys(groups).map((g) => (
        <div key={g} className="mb-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">{g}</p>
          <div className="grid grid-cols-2 gap-2">
            {groups[g].map((i) => { const q = cart[i.id] || 0; return (
              <div key={i.id} className={`bg-white rounded-xl border p-3 ${q ? "border-amber-400" : "border-neutral-100"}`}>
                <div className="text-amber-500 mb-2 h-36 flex items-center justify-center bg-neutral-50 rounded-lg overflow-hidden"><ProdImg item={i} fill onClick={() => setZoom(i)} /></div>
                <p className="text-sm font-medium leading-tight mb-0.5 min-h-[2.4em]">{i.name}</p>
                <p className="text-[10px] text-neutral-400 mb-2">{i.unit}</p>
                {q === 0 ? <button onClick={() => add(i.id)} className="w-full py-2 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold hover:bg-amber-100">+ Adicionar</button>
                  : <div className="flex items-center justify-between"><button onClick={() => sub(i.id)} className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Minus size={16} /></button><span className="text-base font-bold">{q}</span><button onClick={() => add(i.id)} className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center"><Plus size={16} /></button></div>}
              </div>
            ); })}
          </div>
        </div>
      ))}
      <Bar />
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setZoom(null)}>
          <button onClick={() => setZoom(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={28} /></button>
          <img src={imgUrl(zoom)} alt={zoom.name} className="max-w-full max-h-[80vh] object-contain" />
          <p className="text-white text-center mt-4 font-medium">{zoom.name}</p>
          <p className="text-white/50 text-xs">toque para fechar</p>
        </div>
      )}
    </PubShell>
  );
}