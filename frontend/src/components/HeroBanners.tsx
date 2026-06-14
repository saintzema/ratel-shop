"use client";

import { useEffect, useState } from "react";

// Static data at module level — avoids recreation on every render
const PIPELINE = [
  { label: "Order In",    color: "#34d399" },
  { label: "AI Planning", color: "#a78bfa" },
  { label: "Inventory",   color: "#60a5fa" },
  { label: "Fulfillment", color: "#f59e0b" },
  { label: "Escrow",      color: "#f97316" },
  { label: "WA Approval", color: "#ec4899" },
  { label: "Payout Done", color: "#10b981" },
];

const NODES = [
  { x: 8,  y: 15, r: 3 }, { x: 20, y: 60, r: 2 }, { x: 35, y: 25, r: 4 },
  { x: 50, y: 75, r: 2 }, { x: 65, y: 35, r: 3 }, { x: 80, y: 65, r: 2 },
  { x: 92, y: 20, r: 4 }, { x: 15, y: 80, r: 2 }, { x: 75, y: 45, r: 3 },
  { x: 45, y: 50, r: 2 }, { x: 58, y: 85, r: 3 }, { x: 88, y: 80, r: 2 },
];

const ZIVA_MSGS = ["Find me the best deal...", "Compare phone prices...", "Track my order..."];
const TOP_BRANDS = ["Samsung", "LG", "HP", "Xiaomi", "Infinix", "Tecno", "Huawei", "Ecoflow"];

/* ─── ZEMA360 Full-Width Hero Banner ─── */
export function Zema360HeroBanner() {
  const [step, setStep]   = useState(0);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % PIPELINE.length), 1100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #042f2e 55%, #0a0f1e 100%)" }}
    >
      {/* Animated circuit nodes */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }}>
        {NODES.map((n, i) => (
          <circle
            key={i}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r={n.r}
            fill="#10b981"
            style={{
              animation: `zemaPulse ${1.4 + (i % 3) * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
        {NODES.slice(0, 8).map((n, i) => {
          const next = NODES[(i + 2) % NODES.length];
          return (
            <line
              key={`l${i}`}
              x1={`${n.x}%`} y1={`${n.y}%`}
              x2={`${next.x}%`} y2={`${next.y}%`}
              stroke="#10b981" strokeWidth="0.5"
            />
          );
        })}
      </svg>

      <style>{`
        @keyframes zemaPulse {
          0%,100% { opacity:.3; transform:scale(1); }
          50% { opacity:1; transform:scale(1.6); }
        }
        @keyframes zemaFloat {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-4px); }
        }
      `}</style>

      <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-7">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full px-2 md:px-3 py-0.5 border"
                style={{
                  color: "#34d399",
                  borderColor: "rgba(52,211,153,0.4)",
                  background: "rgba(52,211,153,0.08)",
                  opacity: pulse ? 1 : 0.55,
                  transition: "opacity 0.4s",
                }}
              >
                ⚡ AI-POWERED
              </span>
              <span className="hidden md:inline text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                Powered by Qwen · Alibaba Cloud
              </span>
            </div>
            <h2 className="text-white font-black leading-none tracking-tight" style={{ fontSize: "clamp(1.25rem,3vw,2rem)" }}>
              ZEMA<span style={{ color: "#10b981" }}>360</span>
            </h2>
            <p className="text-gray-400 text-[10px] md:text-sm font-medium mt-0.5">
              Autonomous Commerce OS
            </p>
          </div>

          {/* Pipeline visualization — desktop only */}
          <div className="hidden md:flex flex-col gap-1 items-end">
            <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Live Pipeline</span>
            {PIPELINE.map((p, i) => (
              <div
                key={p.label}
                className="flex items-center gap-1.5"
                style={{
                  opacity: i === step ? 1 : 0.22,
                  transform: i === step ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.4s ease",
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: 6, height: 6,
                    background: i === step ? p.color : "#374151",
                    boxShadow: i === step ? `0 0 8px ${p.color}` : "none",
                    transition: "all 0.4s ease",
                  }}
                />
                <span className="text-[9px] font-bold" style={{ color: i === step ? p.color : "#6b7280" }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: stats + CTA */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-gray-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1.5">
              Why sellers choose ZEMA360
            </p>
            <div className="flex items-center gap-3 md:gap-6">
              {[
                { val: "23s", sub: "Order→Payout", color: "#10b981", delay: "0s" },
                { val: "3×",  sub: "Profit Margin", color: "#fff",     delay: "0.4s" },
                { val: "99.7%", sub: "Accuracy",   color: "#a78bfa",   delay: "0.8s" },
              ].map(({ val, sub, color, delay }) => (
                <div key={sub} style={{ animation: `zemaFloat 2.5s ease-in-out infinite`, animationDelay: delay }}>
                  <div className="font-black" style={{ color, fontSize: "clamp(1rem,2.5vw,1.5rem)" }}>{val}</div>
                  <div className="text-gray-500 text-[7px] md:text-[8px] font-bold uppercase tracking-wider">{sub}</div>
                </div>
              ))}
            </div>
          </div>
          <a
            href="/zema360"
            onClick={e => e.stopPropagation()}
            className="font-black uppercase tracking-widest rounded-full transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff",
              fontSize: "clamp(8px,1.2vw,11px)",
              padding: "6px 16px",
              boxShadow: "0 8px 20px -4px rgba(16,185,129,0.45)",
            }}
          >
            Learn More →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Flash Deals Ad Slot ─── */
export function FlashDealsBanner() {
  const [bright, setBright] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBright(b => !b), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2"
      style={{ background: "linear-gradient(135deg,#7c3aed 0%,#be123c 100%)" }}
    >
      <div style={{
        fontSize: "clamp(10px,2vw,14px)", fontWeight: 900,
        color: bright ? "#fef08a" : "#fde047",
        textShadow: bright ? "0 0 8px rgba(253,224,71,0.8)" : "none",
        transition: "color .3s, text-shadow .3s",
      }}>⚡ FLASH</div>
      <div style={{ fontSize: "clamp(18px,4vw,26px)", color: "#fff", fontWeight: 900, lineHeight: 1 }}>70%</div>
      <div style={{ fontSize: "clamp(7px,1.5vw,10px)", color: "#fde68a", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>
        OFF Today
      </div>
      <div style={{ fontSize: "clamp(6px,1.2vw,9px)", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginTop: 2 }}>
        Electronics · Phones
      </div>
    </div>
  );
}

/* ─── New Arrivals Ad Slot ─── */
export function NewArrivalsBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 80);
    const loop = setInterval(() => {
      setVisible(false);
      setTimeout(() => setVisible(true), 80);
    }, 3200);
    return () => { clearTimeout(show); clearInterval(loop); };
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2"
      style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#5b21b6 100%)" }}
    >
      <div
        style={{
          textAlign: "center",
          transform: visible ? "translateY(0)" : "translateY(40px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ fontSize: "clamp(7px,1.4vw,10px)", color: "#c4b5fd", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 2 }}>
          ✨ Just In
        </div>
        <div style={{ fontSize: "clamp(14px,3vw,20px)", color: "#fff", fontWeight: 900, lineHeight: 1.1 }}>
          New<br />Arrivals
        </div>
        <div style={{ fontSize: "clamp(7px,1.3vw,10px)", color: "#a78bfa", fontWeight: 700, marginTop: 4 }}>
          Shop Now →
        </div>
      </div>
    </div>
  );
}

/* ─── Top Brands Ad Slot ─── */
export function TopBrandsBanner() {
  const [offset, setOffset] = useState(0);
  const visible = TOP_BRANDS.slice(offset % TOP_BRANDS.length, offset % TOP_BRANDS.length + 4);

  useEffect(() => {
    const t = setInterval(() => setOffset(o => o + 4), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2"
      style={{ background: "#fff" }}
    >
      <div style={{ fontSize: "clamp(7px,1.3vw,9px)", color: "#9ca3af", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>
        Top Brands
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: "100%" }}>
        {visible.map(b => (
          <div
            key={b}
            style={{
              background: "#f9fafb", borderRadius: 6, padding: "3px 4px",
              textAlign: "center", fontSize: "clamp(6px,1.2vw,9px)", fontWeight: 700,
              color: "#374151", border: "1px solid #f3f4f6",
            }}
          >
            {b}
          </div>
        ))}
      </div>
      <div style={{ fontSize: "clamp(6px,1.2vw,9px)", color: "#10b981", fontWeight: 700 }}>
        Explore All →
      </div>
    </div>
  );
}

/* ─── Ziva AI Ad Slot ─── */
export function ZivaAIBanner() {
  const [dot, setDot]       = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDot(n => (n + 1) % 3), 380);
    return () => clearInterval(d);
  }, []);

  useEffect(() => {
    const m = setInterval(() => setMsgIdx(i => (i + 1) % ZIVA_MSGS.length), 3000);
    return () => clearInterval(m);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2"
      style={{ background: "linear-gradient(135deg,#0f172a 0%,#064e3b 100%)" }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(52,211,153,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#34d399", fontSize: 13, fontWeight: 900,
      }}>Z</div>
      <div style={{
        background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 7px",
        fontSize: "clamp(6px,1.2vw,8px)", color: "#d1d5db", fontWeight: 600,
        maxWidth: "90%", textAlign: "center",
      }}>
        "{ZIVA_MSGS[msgIdx]}"
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 4, height: 4, borderRadius: "50%",
            background: "#10b981", opacity: dot === i ? 1 : 0.25,
            transition: "opacity 0.15s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: "clamp(6px,1.1vw,8px)", color: "#6b7280", fontWeight: 700 }}>
        Chat with Ziva
      </div>
    </div>
  );
}
