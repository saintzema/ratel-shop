"use client";

import { useEffect, useState } from "react";
import { Package, Zap, MessageCircle } from "lucide-react";

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

const ZIVA_MSGS = ["Find me the best deal...", "Compare phone prices...", "Track my order...", "Negotiate a discount..."];

const SELLER_PERKS = [
  { icon: Package,      label: "Auto Fulfillment" },
  { icon: Zap,          label: "Instant Payouts" },
  { icon: MessageCircle, label: "24/7 AI Support" },
];

/* ─── Brand Logo SVGs ─── */
const BrandLogos: Record<string, { svg: React.ReactNode; bg: string }> = {
  Samsung: {
    bg: "#1428A0",
    svg: (
      <svg viewBox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <text x="55" y="21" textAnchor="middle" fill="white" fontSize="17" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="1">SAMSUNG</text>
      </svg>
    ),
  },
  LG: {
    bg: "#A50034",
    svg: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="28" cy="28" r="26" fill="#A50034" />
        <circle cx="28" cy="28" r="26" fill="none" stroke="white" strokeWidth="1.5" />
        <text x="10" y="37" fill="white" fontSize="22" fontWeight="900" fontFamily="Arial, sans-serif">LG</text>
        <line x1="28" y1="14" x2="28" y2="42" stroke="white" strokeWidth="1.2" opacity="0.6"/>
        <line x1="14" y1="28" x2="42" y2="28" stroke="white" strokeWidth="1.2" opacity="0.6"/>
      </svg>
    ),
  },
  HP: {
    bg: "#0096D6",
    svg: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="28" cy="28" r="26" fill="#0096D6" />
        <text x="9" y="38" fill="white" fontSize="26" fontWeight="900" fontFamily="Arial, sans-serif" fontStyle="italic">hp</text>
      </svg>
    ),
  },
  Xiaomi: {
    bg: "#FF6900",
    svg: (
      <svg viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="80" height="36" rx="6" fill="#FF6900"/>
        <text x="40" y="26" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="Arial, sans-serif">mi</text>
      </svg>
    ),
  },
  Huawei: {
    bg: "#CF0A2C",
    svg: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Huawei tulip/flower — 8 petals */}
        <circle cx="28" cy="28" r="26" fill="#CF0A2C" />
        {[0,45,90,135,180,225,270,315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx2 = 28 + Math.cos(rad) * 10;
          const cy2 = 28 + Math.sin(rad) * 10;
          return (
            <ellipse
              key={i}
              cx={cx2} cy={cy2}
              rx="4" ry="8"
              transform={`rotate(${angle}, ${cx2}, ${cy2})`}
              fill="white" opacity="0.92"
            />
          );
        })}
        <circle cx="28" cy="28" r="5" fill="#CF0A2C" />
      </svg>
    ),
  },
  Infinix: {
    bg: "#1A1A2E",
    svg: (
      <svg viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="100" height="32" rx="4" fill="#1A1A2E"/>
        <text x="50" y="23" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="2">INFINIX</text>
      </svg>
    ),
  },
  Tecno: {
    bg: "#1546A0",
    svg: (
      <svg viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="100" height="32" rx="4" fill="#1546A0"/>
        <text x="50" y="23" textAnchor="middle" fill="white" fontSize="15" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="1.5">TECNO</text>
      </svg>
    ),
  },
  Ecoflow: {
    bg: "#00A651",
    svg: (
      <svg viewBox="0 0 110 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="110" height="32" rx="4" fill="#00A651"/>
        {/* Lightning bolt */}
        <polygon points="18,6 10,18 16,18 14,28 24,14 18,14" fill="white"/>
        <text x="62" y="22" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="0.5">EcoFlow</text>
      </svg>
    ),
  },
};

const BRAND_KEYS = ["Samsung", "LG", "HP", "Xiaomi", "Huawei", "Infinix", "Tecno", "Ecoflow"];

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
      {/* Static circuit nodes — no per-node CSS animation to keep GPU load low */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        {NODES.map((n, i) => (
          <circle key={i} cx={`${n.x}%`} cy={`${n.y}%`} r={n.r} fill="#10b981" />
        ))}
        {NODES.slice(0, 8).map((n, i) => {
          const next = NODES[(i + 2) % NODES.length];
          return (
            <line key={`l${i}`} x1={`${n.x}%`} y1={`${n.y}%`} x2={`${next.x}%`} y2={`${next.y}%`} stroke="#10b981" strokeWidth="0.5" />
          );
        })}
      </svg>

      <style>{`
        @keyframes zemaFloat {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-4px); }
        }
        @keyframes flashGlow {
          0%,100% { box-shadow: 0 0 0px rgba(250,204,21,0); }
          50% { box-shadow: 0 0 18px rgba(250,204,21,0.6); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zivaTyping {
          0%,100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>

      {/* Full-banner click target — sits below all interactive elements */}
      <a
        href="/zema360"
        className="absolute inset-0"
        style={{ zIndex: 6 }}
        aria-label="Explore ZEMA360 Autonomous Commerce OS"
      />

      {/* Three-column layout: brand LEFT · tagline+perks CENTER · pipeline+metrics+CTA RIGHT */}
      <div className="absolute inset-0 flex items-stretch pl-4 pr-2 md:px-6 py-4 md:py-6 pb-6 gap-3 md:gap-6" style={{ zIndex: 7 }}>

        {/* ── LEFT: Brand identity ── */}
        <div className="flex flex-col justify-center flex-shrink-0 min-w-0">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span
              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full px-2 md:px-3 py-0.5 border whitespace-nowrap"
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
          </div>

          {/* Title */}
          <h2
            className="text-white font-black leading-none tracking-tight mb-1"
            style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)" }}
          >
            ZEMA<span style={{ color: "#10b981" }}>360</span>
          </h2>

          {/* Subtitle */}
          <p className="font-black uppercase tracking-widest mb-1 md:mb-3" style={{ color: "#34d399", fontSize: "clamp(8px,1.1vw,10px)", whiteSpace: "nowrap" }}>
            Autonomous e-Commerce OS
          </p>

          {/* GET ACCESS — plain text link, no button chrome (per feedback: remove the
              rectangle around it), golden-yellow to match the brand's gold accent. Kept
              in normal flow, centered under the brand block on mobile / left-aligned on
              desktop, same as before. */}
          <a
            href="/zema360"
            onClick={e => e.stopPropagation()}
            className="self-center sm:self-start font-black uppercase tracking-widest transition-all active:scale-95 hover:opacity-80 inline-flex items-center gap-1.5"
            style={{
              color: "#fbbf24",
              fontSize: "clamp(9px,1.2vw,13px)",
              whiteSpace: "nowrap",
            }}
          >
            Get Access
            <span aria-hidden="true">→</span>
          </a>

          {/* Tagline — mobile only (center column hidden on mobile). */}
          {/* Left-aligned, not centred: the hero's overlaid DASHBOARD / START
              SELLING button sits over the middle-right of this banner and was
              clipping the end of this line. Hugging the left edge keeps the
              whole tagline clear of it. */}
          <p className="sm:hidden text-gray-300 font-medium leading-snug mt-1.5 text-left" style={{ fontSize: "clamp(9px,2vw,11px)", maxWidth: "18ch", marginLeft: 0, marginRight: "auto" }}>
            AI agents — fully hands-free.
          </p>
        </div>

        {/* ── CENTER: Tagline · What sellers get (desktop only) ── */}
        <div className="hidden sm:flex flex-col justify-center flex-1 min-w-0 px-1 md:px-3">
          {/* Tagline */}
          <p className="text-gray-400 font-medium leading-snug mb-3 md:mb-4" style={{ fontSize: "clamp(9px,1.15vw,13px)", maxWidth: "26ch" }}>
            AI agents that handle every order, escrow & payout — fully hands-free.
          </p>

          {/* What sellers get */}
          <span className="text-gray-500 text-[7px] md:text-[9px] font-black uppercase tracking-widest mb-2 md:mb-2.5">
            What Sellers Get
          </span>
          <div className="flex items-start gap-3 md:gap-5">
            {SELLER_PERKS.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center text-center"
                style={{ animation: "zemaFloat 2.5s ease-in-out infinite", animationDelay: `${i * 0.4}s` }}
              >
                <div
                  className="flex items-center justify-center rounded-full mb-1.5"
                  style={{
                    width: "clamp(22px,2.8vw,32px)",
                    height: "clamp(22px,2.8vw,32px)",
                    background: "rgba(16,185,129,0.14)",
                    border: "1px solid rgba(52,211,153,0.35)",
                    boxShadow: "0 0 10px rgba(16,185,129,0.12)",
                  }}
                >
                  <Icon style={{ width: "clamp(9px,1.1vw,14px)", height: "clamp(9px,1.1vw,14px)" }} color="#34d399" strokeWidth={2.5} />
                </div>
                <span className="text-gray-400 font-bold leading-tight" style={{ fontSize: "clamp(7px,0.85vw,9px)", maxWidth: "10ch" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Pipeline (desktop) · Metrics (desktop) · GET ACCESS (all screens) ── */}
        <div className="flex flex-col items-end flex-shrink-0" style={{ minWidth: "min(40%,155px)", gap: "clamp(8px,1.5vw,14px)" }}>

          {/* Live pipeline — desktop only */}
          <div className="hidden sm:flex flex-col gap-[3px] items-end">
            <span className="text-gray-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest mb-0.5">Live Pipeline</span>
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
                <span className="text-[8px] md:text-[9px] font-bold" style={{ color: i === step ? p.color : "#6b7280" }}>
                  {p.label}
                </span>
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 5, height: 5,
                    background: i === step ? p.color : "#374151",
                    boxShadow: i === step ? `0 0 6px ${p.color}` : "none",
                    transition: "all 0.4s ease",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Metrics — desktop only */}
          <div className="hidden sm:flex flex-col items-end gap-1.5 md:gap-2">
            {[
              { val: "23s",   sub: "Order→Payout", color: "#10b981", delay: "0s"   },
              { val: "3×",    sub: "Profit Margin", color: "#fff",    delay: "0.4s" },
              { val: "99.7%", sub: "Accuracy",      color: "#a78bfa", delay: "0.8s" },
            ].map(({ val, sub, color, delay }) => (
              <div key={sub} className="text-right" style={{ animation: "zemaFloat 2.5s ease-in-out infinite", animationDelay: delay }}>
                <div className="font-black leading-none" style={{ color, fontSize: "clamp(0.85rem,1.8vw,1.2rem)" }}>{val}</div>
                <div className="text-gray-500 font-bold uppercase tracking-wider" style={{ fontSize: "clamp(5px,0.8vw,7px)" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Mobile-only seller perks — 3 mini badges stacked */}
          <div className="sm:hidden flex flex-col items-end gap-1.5 flex-1 justify-center">
            {SELLER_PERKS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 700 }}>{label}</span>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 18, height: 18, background: "rgba(16,185,129,0.14)", border: "1px solid rgba(52,211,153,0.3)" }}
                >
                  <Icon size={9} color="#34d399" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Flash Deals Ad Slot ─── */
export function FlashDealsBanner() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 650);
    return () => clearInterval(t);
  }, []);

  const glow = tick % 2 === 0;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(145deg,#4c0519 0%,#7c1d6f 50%,#3b0764 100%)" }}
    >
      {/* Radial highlight */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(circle at 50% 40%, rgba(251,191,36,0.12) 0%, transparent 70%)",
      }}/>

      {/* Lightning badge */}
      <div
        className="flex items-center justify-center rounded-full mb-1"
        style={{
          width: 32, height: 32,
          background: glow ? "rgba(251,191,36,0.22)" : "rgba(251,191,36,0.08)",
          border: `1.5px solid ${glow ? "rgba(251,191,36,0.7)" : "rgba(251,191,36,0.3)"}`,
          transition: "all 0.35s ease",
          boxShadow: glow ? "0 0 14px rgba(251,191,36,0.5)" : "none",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={glow ? "#fbbf24" : "#f59e0b"}>
          <polygon points="13,2 4,14 11,14 11,22 20,10 13,10" />
        </svg>
      </div>

      <div style={{
        fontSize: "clamp(9px,1.8vw,12px)",
        fontWeight: 900,
        color: glow ? "#fde68a" : "#fcd34d",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        textShadow: glow ? "0 0 10px rgba(253,230,138,0.7)" : "none",
        transition: "all 0.35s ease",
      }}>Flash</div>

      <div style={{
        fontSize: "clamp(26px,5.5vw,40px)",
        fontWeight: 900,
        color: "#ffffff",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        textShadow: "0 2px 16px rgba(0,0,0,0.4)",
      }}>70%</div>

      <div style={{
        fontSize: "clamp(7px,1.3vw,10px)",
        fontWeight: 800,
        color: "rgba(253,230,138,0.9)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginTop: 1,
      }}>OFF · Today Only</div>

      <div style={{
        marginTop: 6,
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(4px)",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: "clamp(6px,1.1vw,8px)",
        fontWeight: 700,
        color: "rgba(255,255,255,0.6)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        border: "1px solid rgba(255,255,255,0.12)",
      }}>Electronics · Phones</div>
    </div>
  );
}

/* ─── New Arrivals Ad Slot ─── */
export function NewArrivalsBanner() {
  const [visible, setVisible] = useState(false);
  const [dotIdx, setDotIdx]   = useState(0);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 80);
    const loop = setInterval(() => {
      setVisible(false);
      setTimeout(() => setVisible(true), 300);
    }, 3500);
    return () => { clearTimeout(show); clearInterval(loop); };
  }, []);

  useEffect(() => {
    const d = setInterval(() => setDotIdx(i => (i + 1) % 3), 600);
    return () => clearInterval(d);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(145deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }}
    >
      {/* Star sparkles */}
      {[
        { top: "12%", left: "15%", size: 4, delay: "0s" },
        { top: "22%", right: "18%", size: 3, delay: "0.4s" },
        { top: "65%", left: "12%", size: 2.5, delay: "0.8s" },
        { top: "75%", right: "14%", size: 3.5, delay: "0.2s" },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            ...s as any,
            width: s.size, height: s.size,
            animation: `zivaTyping 1.8s ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}

      <div
        style={{
          textAlign: "center",
          transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
          opacity: visible ? 1 : 0,
          transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(167,139,250,0.15)",
          border: "1px solid rgba(167,139,250,0.4)",
          borderRadius: 20,
          padding: "2px 8px",
          marginBottom: 6,
        }}>
          <svg width="8" height="8" viewBox="0 0 10 10">
            <polygon points="5,0 6.1,3.5 10,3.5 6.9,5.7 8,9 5,7 2,9 3.1,5.7 0,3.5 3.9,3.5" fill="#c4b5fd"/>
          </svg>
          <span style={{
            fontSize: "clamp(6px,1.2vw,8px)",
            fontWeight: 800,
            color: "#c4b5fd",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}>Just In</span>
        </div>

        <div style={{
          fontSize: "clamp(16px,3.5vw,24px)",
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          textShadow: "0 2px 20px rgba(167,139,250,0.4)",
        }}>
          New<br/>Arrivals
        </div>

        {/* Animated dots */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: i === dotIdx ? 14 : 5,
              height: 5,
              borderRadius: 3,
              background: i === dotIdx ? "#a78bfa" : "rgba(167,139,250,0.3)",
              transition: "all 0.4s ease",
            }}/>
          ))}
        </div>

        <div style={{
          fontSize: "clamp(7px,1.3vw,9px)",
          fontWeight: 700,
          color: "#a78bfa",
          marginTop: 6,
          letterSpacing: "0.05em",
        }}>
          Shop Now →
        </div>
      </div>
    </div>
  );
}

/* ─── Top Brands Ad Slot ─── */
export function TopBrandsBanner() {
  // Pair brands into rows of 2 for vertical scroll
  const pairs: [string, string][] = [];
  for (let i = 0; i < BRAND_KEYS.length; i += 2) {
    pairs.push([BRAND_KEYS[i], BRAND_KEYS[(i + 1) % BRAND_KEYS.length]]);
  }
  // Duplicate for seamless infinite loop: animate translateY(0) → translateY(-50%)
  const allPairs = [...pairs, ...pairs];
  const duration = pairs.length * 1.6; // seconds for one full cycle

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden select-none"
      style={{ background: "#f8fafc" }}
    >
      <style>{`
        @keyframes brandScrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>

      {/* Header strip */}
      <div style={{
        background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
        padding: "5px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "clamp(6px,1.1vw,9px)",
          fontWeight: 900,
          color: "#94a3b8",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>Top Brands</span>
        <span style={{
          fontSize: "clamp(5px,1vw,8px)",
          fontWeight: 700,
          color: "#10b981",
        }}>Official Sellers ✓</span>
      </div>

      {/* Vertical scrolling brand rows — 2 per row, peek of next row below */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", padding: "4px 6px 0" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          animation: `brandScrollUp ${duration}s linear infinite`,
        }}>
          {allPairs.map(([b1, b2], idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                height: 52,
                flexShrink: 0,
              }}
            >
              {[b1, b2].map(brand => {
                const { bg, svg } = BrandLogos[brand];
                return (
                  <div
                    key={`${idx}-${brand}`}
                    style={{
                      borderRadius: 8,
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div style={{ width: "80%", height: "65%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {svg}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "4px 8px 6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "clamp(6px,1.1vw,8px)",
          fontWeight: 700,
          color: "#10b981",
          cursor: "pointer",
        }}>Explore All →</span>
      </div>
    </div>
  );
}

/* ─── Ziva AI Ad Slot ─── */
export function ZivaAIBanner() {
  const [dot, setDot]       = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const d = setInterval(() => setDot(n => (n + 1) % 3), 380);
    return () => clearInterval(d);
  }, []);

  useEffect(() => {
    const m = setInterval(() => {
      setTyping(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % ZIVA_MSGS.length);
        setTyping(true);
      }, 350);
    }, 2800);
    return () => clearInterval(m);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(145deg,#0f172a 0%,#042f2e 60%,#0f172a 100%)" }}
    >
      {/* Glow orb */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {/* Ziva avatar — same image used in the Ziva chat FAB */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "2px solid rgba(52,211,153,0.6)",
        marginBottom: 6,
        boxShadow: "0 0 20px rgba(16,185,129,0.4)",
        overflow: "hidden",
        flexShrink: 0,
        background: "#021f17",
      }}>
        <img
          src="/assets/images/image_v2.png"
          alt="Ziva AI"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
        />
      </div>

      {/* Name */}
      <div style={{
        fontSize: "clamp(8px,1.4vw,10px)",
        fontWeight: 900,
        color: "#34d399",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: 5,
      }}>Ziva AI</div>

      {/* Chat bubble */}
      <div style={{
        background: "rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(52,211,153,0.2)",
        borderRadius: 10,
        padding: "5px 8px",
        maxWidth: "88%",
        textAlign: "center",
        minHeight: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: typing ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>
        <span style={{
          fontSize: "clamp(6px,1.2vw,8px)",
          color: "#d1d5db",
          fontWeight: 600,
          fontStyle: "italic",
        }}>
          &ldquo;{ZIVA_MSGS[msgIdx]}&rdquo;
        </span>
      </div>

      {/* Typing indicator */}
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#10b981",
            opacity: dot === i ? 1 : 0.2,
            transform: dot === i ? "scale(1.3)" : "scale(1)",
            transition: "all 0.15s ease",
          }} />
        ))}
      </div>

      <div style={{
        fontSize: "clamp(6px,1.1vw,8px)",
        color: "#6b7280",
        fontWeight: 700,
        marginTop: 5,
        letterSpacing: "0.05em",
      }}>
        Chat with Ziva
      </div>
    </div>
  );
}
