/* Offline SQL cache (SQLite via sql.js), saved in the browser's IndexedDB */
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";
let db, ready, timer;

const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open("evercrest", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("sqlite");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
});
const idbGet = async k => { const d = await idb(); return new Promise(res => { const g = d.transaction("sqlite").objectStore("sqlite").get(k); g.onsuccess = () => res(g.result); g.onerror = () => res(null); }); };
const idbSet = async (k, v) => { const d = await idb(); return new Promise(res => { const t = d.transaction("sqlite", "readwrite"); t.objectStore("sqlite").put(v, k); t.oncomplete = t.onerror = () => res(); }); };
const loadScript = src => new Promise((res, rej) => {
    if (window.initSqlJs) return res();
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
});

export function openDb() {
    return ready || (ready = (async () => {
        await loadScript(CDN + "sql-wasm.js");
        const SQL = await initSqlJs({ locateFile: f => CDN + f });
        const saved = await idbGet("db");
        db = saved ? new SQL.Database(saved) : new SQL.Database();
        db.run(`CREATE TABLE IF NOT EXISTS profile(uid TEXT PRIMARY KEY, data TEXT);
            CREATE TABLE IF NOT EXISTS account(uid TEXT PRIMARY KEY, balance REAL, currency TEXT);
            CREATE TABLE IF NOT EXISTS notifs(id TEXT, uid TEXT, title TEXT, message TEXT, createdAt INTEGER, read INTEGER, PRIMARY KEY(uid,id));`);
        return db;
    })());
}
export function q(sql, params = []) {
    const st = db.prepare(sql); st.bind(params);
    const out = []; while (st.step()) out.push(st.getAsObject());
    st.free(); return out;
}
export function run(sql, params = []) {
    db.run(sql, params);
    clearTimeout(timer);
    timer = setTimeout(() => idbSet("db", db.export()), 300); /* save silently */
}