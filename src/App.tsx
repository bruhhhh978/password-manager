import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONFIG } from "./config";

interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  strength: "weak" | "medium" | "strong" | "very-strong";
  createdAt: number;
}

export default function App() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ site: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [vaultCreated, setVaultCreated] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // ===== Strength Checker =====
  function checkStrength(password: string): PasswordEntry["strength"] {
    if (password.length === 0) return "weak";
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return "weak";
    if (score === 2) return "medium";
    if (score === 3) return "strong";
    return "very-strong";
  }

  function getStrengthInfo(strength: PasswordEntry["strength"]) {
    const map = {
      "weak": { label: "Yếu", color: "#ef4444", width: "25%", tip: "Thêm chữ hoa, số và ký tự đặc biệt" },
      "medium": { label: "Trung bình", color: "#f59e0b", width: "50%", tip: "Thêm ký tự đặc biệt để mạnh hơn" },
      "strong": { label: "Mạnh", color: "#22c55e", width: "75%", tip: "Tốt! Có thể dài hơn nữa" },
      "very-strong": { label: "Rất mạnh", color: "#4DA2FF", width: "100%", tip: "Tuyệt vời!" },
    };
    return map[strength];
  }

  // ===== Core Functions =====
  async function createVault() {
    if (!account) return;
    setLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONFIG.PACKAGE_ID}::password_manager::create_vault`,
        arguments: [tx.pure.vector("u8", []), tx.pure.vector("u8", [])],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setVaultCreated(true); setLoading(false); },
        onError: () => setLoading(false),
      });
    } catch { setLoading(false); }
  }

  function addPassword() {
    if (!newEntry.site || !newEntry.username || !newEntry.password) return;
    const strength = checkStrength(newEntry.password);
    setPasswords([...passwords, {
      id: Date.now().toString(),
      ...newEntry,
      strength,
      createdAt: Date.now(),
    }]);
    setNewEntry({ site: "", username: "", password: "" });
    setActiveTab("list");
  }

  function deletePassword(id: string) {
    setPasswords(passwords.filter((p) => p.id !== id));
  }

  function copyPassword(id: string, password: string) {
    navigator.clipboard.writeText(password);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // ===== Backup / Restore =====
  function backupPasswords() {
    const data = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      owner: account?.address,
      passwords,
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restorePasswords(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.passwords) return alert("File backup không hợp lệ!");
        setPasswords(data.passwords);
        alert(`✅ Khôi phục thành công ${data.passwords.length} mật khẩu!`);
      } catch {
        alert("❌ File backup bị lỗi!");
      }
    };
    reader.readAsText(file);
  }

  const filtered = passwords.filter(
    (p) =>
      p.site.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #0f1117; color: #ffffff; min-height: 100vh; }
        :root {
          --sui-blue: #4DA2FF; --sui-bg: #0f1117;
          --sui-surface: #1a1d2e; --sui-surface-2: #222538;
          --sui-border: rgba(255,255,255,0.08);
          --sui-text: #ffffff; --sui-text-muted: rgba(255,255,255,0.45);
          --sui-success: #22C55E; --sui-danger: #EF4444;
        }
        .app { min-height: 100vh; display: flex; flex-direction: column; }
        .header {
          border-bottom: 1px solid var(--sui-border);
          background: rgba(15,17,23,0.95); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100;
          padding: 0 24px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #4DA2FF, #2563EB);
          border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .logo-text { font-size: 16px; font-weight: 600; letter-spacing: -0.3px; }
        .logo-badge { font-size: 10px; color: var(--sui-text-muted); }
        .main { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; padding: 32px 24px; }
        .landing { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 80px 0; gap: 24px; }
        .landing-icon {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, rgba(77,162,255,0.2), rgba(37,99,235,0.2));
          border: 1px solid rgba(77,162,255,0.3); border-radius: 20px;
          display: flex; align-items: center; justify-content: center; font-size: 32px;
        }
        .landing h2 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .landing p { color: var(--sui-text-muted); font-size: 15px; line-height: 1.6; max-width: 360px; }
        .features { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .feature-chip {
          background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 20px; padding: 6px 14px; font-size: 12px; color: var(--sui-text-muted);
        }
        .vault-create { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 0; gap: 20px; }
        .vault-create h2 { font-size: 22px; font-weight: 600; }
        .vault-create p { color: var(--sui-text-muted); font-size: 14px; }
        .btn-primary {
          background: var(--sui-blue); color: #fff; border: none; border-radius: 10px;
          padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .btn-primary:hover { background: #3b8fe8; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-ghost {
          background: transparent; color: var(--sui-text-muted); border: none;
          font-size: 13px; cursor: pointer; font-family: inherit; text-decoration: underline; padding: 4px;
        }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card {
          background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 12px; padding: 16px; text-align: center;
        }
        .stat-value { font-size: 22px; font-weight: 700; color: var(--sui-blue); }
        .stat-label { font-size: 11px; color: var(--sui-text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .backup-bar { display: flex; gap: 8px; margin-bottom: 16px; }
        .btn-backup {
          flex: 1; padding: "8px 16px";
          background: rgba(77,162,255,0.1); border: 1px solid rgba(77,162,255,0.3);
          border-radius: 8px; color: #4DA2FF; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .btn-restore {
          flex: 1; padding: 8px 16px;
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
          border-radius: 8px; color: #22c55e; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .tabs {
          display: flex; background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 10px; padding: 4px; margin-bottom: 20px; gap: 4px;
        }
        .tab { flex: 1; padding: 8px; border-radius: 7px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .tab-active { background: var(--sui-blue); color: white; }
        .tab-inactive { background: transparent; color: var(--sui-text-muted); }
        .tab-inactive:hover { color: var(--sui-text); background: var(--sui-surface-2); }
        .search-wrap { position: relative; margin-bottom: 16px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--sui-text-muted); font-size: 14px; }
        .search-input {
          width: 100%; background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 10px; padding: 11px 14px 11px 38px; font-size: 14px;
          color: var(--sui-text); font-family: inherit; outline: none; transition: border-color 0.15s;
        }
        .search-input::placeholder { color: var(--sui-text-muted); }
        .search-input:focus { border-color: var(--sui-blue); }
        .pw-list { display: flex; flex-direction: column; gap: 10px; }
        .pw-card {
          background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 12px; padding: 16px; transition: all 0.15s;
          display: flex; align-items: center; gap: 14px;
        }
        .pw-card:hover { border-color: rgba(77,162,255,0.3); background: var(--sui-surface-2); }
        .pw-avatar {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, rgba(77,162,255,0.2), rgba(37,99,235,0.2));
          border: 1px solid rgba(77,162,255,0.2); border-radius: 10px;
          display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
        }
        .pw-info { flex: 1; min-width: 0; }
        .pw-site { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pw-user { font-size: 12px; color: var(--sui-text-muted); margin-top: 2px; }
        .pw-pass { font-size: 12px; color: var(--sui-blue); font-family: monospace; margin-top: 4px; }
        .pw-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .btn-icon {
          background: var(--sui-surface-2); border: 1px solid var(--sui-border);
          border-radius: 7px; padding: 6px 10px; font-size: 12px; cursor: pointer;
          color: var(--sui-text-muted); font-family: inherit; transition: all 0.15s; white-space: nowrap;
        }
        .btn-icon:hover { color: var(--sui-text); border-color: rgba(255,255,255,0.2); }
        .btn-icon-danger:hover { color: var(--sui-danger); border-color: var(--sui-danger); }
        .btn-icon-copied { color: var(--sui-success) !important; border-color: var(--sui-success) !important; }
        .empty { text-align: center; padding: 48px 0; color: var(--sui-text-muted); }
        .empty-icon { font-size: 36px; margin-bottom: 12px; }
        .form-card { background: var(--sui-surface); border: 1px solid var(--sui-border); border-radius: 14px; padding: 24px; }
        .form-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 12px; color: var(--sui-text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
        .form-input {
          width: 100%; background: var(--sui-surface-2); border: 1px solid var(--sui-border);
          border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--sui-text);
          font-family: inherit; outline: none; transition: border-color 0.15s;
        }
        .form-input::placeholder { color: var(--sui-text-muted); }
        .form-input:focus { border-color: var(--sui-blue); }
        .form-divider { border: none; border-top: 1px solid var(--sui-border); margin: 20px 0; }
        .address-bar {
          background: var(--sui-surface); border: 1px solid var(--sui-border);
          border-radius: 8px; padding: 8px 12px; font-size: 12px; color: var(--sui-text-muted);
          font-family: monospace; display: flex; align-items: center; gap: 8px;
        }
        .address-dot { width: 6px; height: 6px; background: var(--sui-success); border-radius: 50%; flex-shrink: 0; }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">🔐</div>
            <div>
              <div className="logo-text">Vault Manager</div>
              <div className="logo-badge">Walrus · Seal · Sui</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 200 }}>
            {account && (
              <div className="address-bar">
                <div className="address-dot" />
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </div>
            )}
            <ConnectButton />
          </div>
        </header>

        <main className="main">
          {!account ? (
            <div className="landing">
              <div className="landing-icon">🔐</div>
              <h2>Quản lý mật khẩu<br />phi tập trung</h2>
              <p>Mật khẩu được mã hóa bằng Seal và lưu trữ trên Walrus. Chỉ bạn mới có thể giải mã.</p>
              <div className="features">
                <span className="feature-chip">🛡️ End-to-end encryption</span>
                <span className="feature-chip">⛓️ On-chain ownership</span>
                <span className="feature-chip">🌊 Decentralized storage</span>
                <span className="feature-chip">🔑 Self-custody</span>
              </div>
            </div>

          ) : !vaultCreated ? (
            <div className="vault-create">
              <div className="landing-icon">🗄️</div>
              <h2>Khởi tạo Vault</h2>
              <p>Vault sẽ được tạo trên Sui blockchain và chỉ bạn mới có quyền truy cập.</p>
              <button className="btn-primary" onClick={createVault} disabled={loading}>
                {loading ? "Đang tạo..." : "Tạo Vault"}
              </button>
              <button className="btn-ghost" onClick={() => setVaultCreated(true)}>
                Bỏ qua (demo mode)
              </button>
            </div>

          ) : (
            <>
              {/* Stats */}
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-value">{passwords.length}</div>
                  <div className="stat-label">Mật khẩu</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{new Set(passwords.map(p => p.site)).size}</div>
                  <div className="stat-label">Website</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "#22C55E" }}>Secure</div>
                  <div className="stat-label">Trạng thái</div>
                </div>
              </div>

              {/* Backup / Restore */}
              <div className="backup-bar">
                <button
                  className="btn-backup"
                  onClick={backupPasswords}
                  disabled={passwords.length === 0}
                >
                  ☁️ Backup
                </button>
                <label className="btn-restore">
                  ☁️ Restore
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) restorePasswords(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "list" ? "tab-active" : "tab-inactive"}`}
                  onClick={() => setActiveTab("list")}
                >
                  Danh sách
                </button>
                <button
                  className={`tab ${activeTab === "add" ? "tab-active" : "tab-inactive"}`}
                  onClick={() => setActiveTab("add")}
                >
                  + Thêm mới
                </button>
              </div>

              {activeTab === "list" ? (
                <>
                  <div className="search-wrap">
                    <span className="search-icon">🔍</span>
                    <input
                      className="search-input"
                      placeholder="Tìm kiếm website, username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">{passwords.length === 0 ? "🔑" : "🔍"}</div>
                      <p>{passwords.length === 0 ? "Chưa có mật khẩu nào" : "Không tìm thấy kết quả"}</p>
                      {passwords.length === 0 && (
                        <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setActiveTab("add")}>
                          Thêm mật khẩu đầu tiên →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pw-list">
                      {filtered.map((p) => (
                        <div key={p.id} className="pw-card">
                          <div className="pw-avatar">🌐</div>
                          <div className="pw-info">
                            <div className="pw-site">{p.site}</div>
                            <div className="pw-user">{p.username}</div>
                            {/* Strength badge */}
                            {(() => {
                              const info = getStrengthInfo(p.strength);
                              return (
                                <span style={{
                                  fontSize: 10, padding: "2px 8px", borderRadius: 20,
                                  background: `${info.color}20`, color: info.color,
                                  border: `1px solid ${info.color}40`,
                                  display: "inline-block", marginTop: 4,
                                }}>
                                  🧠 {info.label}
                                </span>
                              );
                            })()}
                            <div className="pw-pass">
                              {showPassword[p.id] ? p.password : "•".repeat(Math.min(p.password.length, 14))}
                            </div>
                          </div>
                          <div className="pw-actions">
                            <button
                              className="btn-icon"
                              onClick={() => setShowPassword(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                            >
                              {showPassword[p.id] ? "Ẩn" : "Hiện"}
                            </button>
                            <button
                              className={`btn-icon ${copied === p.id ? "btn-icon-copied" : ""}`}
                              onClick={() => copyPassword(p.id, p.password)}
                            >
                              {copied === p.id ? "✓ Copied" : "Copy"}
                            </button>
                            <button
                              className="btn-icon btn-icon-danger"
                              onClick={() => deletePassword(p.id)}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="form-card">
                  <h3>Thêm mật khẩu mới</h3>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input
                      className="form-input"
                      placeholder="vd: google.com"
                      value={newEntry.site}
                      onChange={(e) => setNewEntry({ ...newEntry, site: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username / Email</label>
                    <input
                      className="form-input"
                      placeholder="vd: user@email.com"
                      value={newEntry.username}
                      onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Nhập mật khẩu"
                      value={newEntry.password}
                      onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                    />
                    {/* Strength Checker — đúng chỗ ở đây */}
                    {newEntry.password && (() => {
                      const strength = checkStrength(newEntry.password);
                      const info = getStrengthInfo(strength);
                      return (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ height: 4, background: "#222538", borderRadius: 2, marginBottom: 6, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: info.width, background: info.color, borderRadius: 2, transition: "all 0.3s ease" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: info.color, fontWeight: 600 }}>🧠 {info.label}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{info.tip}</span>
                          </div>
                          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {[
                              { label: "8+ ký tự", ok: newEntry.password.length >= 8 },
                              { label: "Chữ hoa", ok: /[A-Z]/.test(newEntry.password) },
                              { label: "Số", ok: /[0-9]/.test(newEntry.password) },
                              { label: "Ký tự đặc biệt", ok: /[^A-Za-z0-9]/.test(newEntry.password) },
                              { label: "12+ ký tự", ok: newEntry.password.length >= 12 },
                            ].map(item => (
                              <span key={item.label} style={{
                                fontSize: 11, padding: "3px 8px", borderRadius: 20,
                                background: item.ok ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                                color: item.ok ? "#22c55e" : "rgba(255,255,255,0.3)",
                                border: `1px solid ${item.ok ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                                transition: "all 0.2s",
                              }}>
                                {item.ok ? "✓" : "○"} {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr className="form-divider" />
                  <button className="btn-primary" style={{ width: "100%" }} onClick={addPassword}>
                    Lưu mật khẩu
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}