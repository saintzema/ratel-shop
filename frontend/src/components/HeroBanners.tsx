"use client";

import { useEffect, useState } from "react";
import { Package, Zap, MessageCircle, Car, Wrench, Share2, FileText, Navigation2, MapPin, CheckCircle2, Wand2, Instagram, Facebook, Twitter } from "lucide-react";

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

/* ─── Feature Hero Banners ───────────────────────────────────────────────
 * One shared shell (badge, title, subtitle, CTA, full-slide click target)
 * so five feature promos read as one consistent, on-brand hero family
 * instead of five one-off designs — each just supplies its own small
 * animated visual on the right. Replaces the generic stock-photo "Mega
 * Sale" / "New Arrivals" placeholder banners that shipped as the default
 * when no admin banner was configured. */
function FeatureHeroShell({
  href, badge, badgeColor, title, subtitle, gradient, ctaLabel, ctaColor, visual,
}: {
  href: string; badge: string; badgeColor: string; title: React.ReactNode; subtitle: string;
  gradient: string; ctaLabel: string; ctaColor: string; visual: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: gradient }}>
      {/* No full-slide click target — tapping anywhere used to navigate,
          which meant a stray tap while just scrolling past the slide fired
          a full page navigation with no visible affordance that it would.
          Only the explicit CTA text link (below) and the Dashboard/Price
          Checker buttons/arrow/dots the page itself renders are clickable
          now. */}
      {/* This page docks a persistent DASHBOARD / PRICE CHECKER AI button
          pair on top of every slide (bottom bar on mobile) and a shared
          dots/pause indicator top-right (~top-4). Content is raised to
          roughly that same row on mobile (pt-3) rather than sitting lower —
          the only thing it still needs to clear is the bottom button bar,
          not empty space above. The badge also used to share a row with the
          CTA at the very top, on mobile that row is dropped entirely (the
          badge adds little and the CTA moves under the subtitle instead,
          per product feedback) so text and the visual both get real room —
          previously the text column was `w-full` on mobile, which starved
          the visual next to it down to almost nothing. */}
      <div className="absolute inset-0 flex items-start md:items-center pt-3 md:pt-0 px-5 md:pl-8 gap-2 md:gap-3" style={{ zIndex: 7 }}>
        <div className="flex flex-col justify-center min-w-0 w-[58%] md:w-auto md:max-w-[200px]">
          {/* Badge + this slide's own CTA share the top row — desktop only.
              There's no bottom-bar overlay to clear on desktop, so there's
              room for both up top the way there used to be everywhere. */}
          <div className="hidden md:flex items-center justify-between gap-2 mb-3">
            <span
              className="text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-0.5 border whitespace-nowrap"
              style={{ color: badgeColor, borderColor: `${badgeColor}66`, background: `${badgeColor}14` }}
            >
              {badge}
            </span>
            <a
              href={href}
              onClick={e => e.stopPropagation()}
              className="font-black uppercase tracking-widest transition-all active:scale-95 hover:opacity-80 inline-flex items-center gap-1 shrink-0"
              style={{ color: ctaColor, fontSize: "clamp(8px,1.1vw,12px)" }}
            >
              {ctaLabel} <span aria-hidden="true">→</span>
            </a>
          </div>
          <h2 className="text-white font-black leading-tight tracking-tight mb-1.5" style={{ fontSize: "clamp(1.1rem,3vw,1.7rem)" }}>
            {title}
          </h2>
          <p className="text-gray-300 font-medium leading-snug line-clamp-2 md:line-clamp-none" style={{ fontSize: "clamp(9px,1.2vw,12px)", maxWidth: "28ch" }}>
            {subtitle}
          </p>
          {/* Mobile-only CTA, underneath the text — the badge+CTA header row
              is desktop-only above, so this is mobile's only CTA. */}
          <a
            href={href}
            onClick={e => e.stopPropagation()}
            className="md:hidden mt-2 self-start font-black uppercase tracking-widest transition-all active:scale-95 inline-flex items-center gap-1"
            style={{ color: ctaColor, fontSize: "10px" }}
          >
            {ctaLabel} <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="relative w-[38%] shrink-0 h-full flex items-center justify-center min-w-0 md:hidden">
          {visual}
        </div>
      </div>
    </div>
  );
}

/* Book a Ride — a car glyph travels a dashed route between two pins on loop. */
export function RideHeroBanner() {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(v => (v + 1) % 100), 60); return () => clearInterval(i); }, []);
  const carLeft = 12 + t * 0.72;

  return (
    <FeatureHeroShell
      href="/ride"
      badge="NOW LIVE"
      badgeColor="#34d399"
      title={<>Book a <span style={{ color: "#34d399" }}>Ride</span></>}
      subtitle="Name your price, watch verified drivers respond in real time, and track the car all the way to your door."
      gradient="linear-gradient(135deg, #06251c 0%, #0a3d2e 60%, #06251c 100%)"
      ctaLabel="Find a Driver"
      ctaColor="#fbbf24"
      visual={
        <svg viewBox="0 0 220 140" className="w-full h-full" style={{ maxHeight: 130 }}>
          <circle cx="20" cy="100" r="6" fill="#34d399" />
          <circle cx="200" cy="40" r="6" fill="#f87171" />
          <path d="M 20 100 Q 110 20 200 40" fill="none" stroke="#ffffff33" strokeWidth="2" strokeDasharray="5 6" />
          <g transform={`translate(${20 + (carLeft - 12) * 1.8}, ${100 - (carLeft - 12) * 0.9})`}>
            <circle r="10" fill="#0a3d2e" stroke="#34d399" strokeWidth="2" />
            <Car x={-6} y={-6} width={12} height={12} color="#34d399" strokeWidth={2.5} />
          </g>
        </svg>
      }
    />
  );
}

/* Send a Package — a package glides along a dotted delivery route. */
export function DeliveryHeroBanner() {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(v => (v + 1) % 100), 60); return () => clearInterval(i); }, []);

  return (
    <FeatureHeroShell
      href="/send-package"
      badge="DOOR TO DOOR"
      badgeColor="#38bdf8"
      title={<>Send a <span style={{ color: "#38bdf8" }}>Package</span></>}
      subtitle="Post what you're sending, pick your courier's price, and track pickup to drop-off live on the map."
      gradient="linear-gradient(135deg, #071a2b 0%, #0a2e4a 60%, #071a2b 100%)"
      ctaLabel="Send Now"
      ctaColor="#fbbf24"
      visual={
        <svg viewBox="0 0 220 140" className="w-full h-full" style={{ maxHeight: 130 }}>
          <MapPin x={4} y={90} width={20} height={20} color="#38bdf8" />
          <MapPin x={190} y={16} width={20} height={20} color="#f87171" />
          <path d="M 20 105 Q 110 10 200 30" fill="none" stroke="#ffffff33" strokeWidth="2" strokeDasharray="4 7" />
          <g transform={`translate(${20 + t * 1.6}, ${100 - t * 0.75})`}>
            <rect x={-9} y={-9} width={18} height={18} rx={4} fill="#0a2e4a" stroke="#38bdf8" strokeWidth="2" />
            <Package x={-6} y={-6} width={12} height={12} color="#38bdf8" strokeWidth={2.5} />
          </g>
        </svg>
      }
    />
  );
}

/* Hire an Expert — skill icons fade in/out one at a time. */
export function ExpertsHeroBanner() {
  const icons = [Wrench, FileText, MessageCircle];
  const [active, setActive] = useState(0);
  useEffect(() => { const i = setInterval(() => setActive(a => (a + 1) % icons.length), 1300); return () => clearInterval(i); }, []);

  return (
    <FeatureHeroShell
      href="/services"
      badge="VERIFIED PROS"
      badgeColor="#a78bfa"
      title={<>Hire an <span style={{ color: "#a78bfa" }}>Expert</span></>}
      subtitle="Web design, repairs, events, tutoring — request a quote from a real professional near you."
      gradient="linear-gradient(135deg, #1a1030 0%, #2e1a4d 60%, #1a1030 100%)"
      ctaLabel="Browse Experts"
      ctaColor="#fbbf24"
      visual={
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
          <div className="absolute rounded-full" style={{ width: 100, height: 100, border: "1.5px dashed #a78bfa55" }} />
          {icons.map((Icon, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center rounded-2xl transition-all duration-500"
              style={{
                width: 46, height: 46,
                background: active === i ? "#a78bfa" : "#a78bfa1f",
                transform: `translate(${Math.cos((i / icons.length) * 2 * Math.PI - Math.PI / 2) * 46}px, ${Math.sin((i / icons.length) * 2 * Math.PI - Math.PI / 2) * 46}px) scale(${active === i ? 1.15 : 0.9})`,
                boxShadow: active === i ? "0 0 20px rgba(167,139,250,0.6)" : "none",
              }}
            >
              <Icon size={20} color={active === i ? "#1a1030" : "#a78bfa"} strokeWidth={2.5} />
            </div>
          ))}
        </div>
      }
    />
  );
}

/* Social Multi-Post — platform glyphs cycle, then a checkmark confirms "posted". */
export function SocialMultiPostHeroBanner() {
  const [step, setStep] = useState(0);
  const platforms = [
    { Icon: Instagram, color: "#f472b6" },
    { Icon: Facebook, color: "#60a5fa" },
    { Icon: Twitter, color: "#38bdf8" },
  ];
  useEffect(() => { const i = setInterval(() => setStep(s => (s + 1) % (platforms.length + 1)), 700); return () => clearInterval(i); }, []);

  return (
    <FeatureHeroShell
      href="/seller/social"
      badge="ONE CLICK, EVERYWHERE"
      badgeColor="#f472b6"
      title={<>Post <span style={{ color: "#f472b6" }}>Everywhere</span>, Instantly</>}
      subtitle="Turn a listing into a scroll-stopping post for Instagram, Facebook & WhatsApp — with one tap."
      gradient="linear-gradient(135deg, #2b0f1e 0%, #4d1a35 60%, #2b0f1e 100%)"
      ctaLabel="Try Social Multi-Post"
      ctaColor="#fbbf24"
      visual={
        <div className="flex items-center gap-3">
          {platforms.map(({ Icon, color }, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-2xl transition-all duration-300"
              style={{
                width: 44, height: 44,
                background: step === i ? color : `${color}22`,
                transform: step === i ? "translateY(-6px) scale(1.1)" : "scale(1)",
                boxShadow: step === i ? `0 8px 20px ${color}66` : "none",
              }}
            >
              <Icon size={20} color={step === i ? "#2b0f1e" : color} strokeWidth={2.5} />
            </div>
          ))}
          <div
            className="flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              width: 44, height: 44,
              background: step === platforms.length ? "#34d399" : "#34d39922",
              transform: step === platforms.length ? "scale(1.15)" : "scale(0.9)",
            }}
          >
            <CheckCircle2 size={22} color={step === platforms.length ? "#2b0f1e" : "#34d399"} strokeWidth={2.5} />
          </div>
        </div>
      }
    />
  );
}

/* AI Quote — a quote line "types" itself out, cursor blinking, then resets. */
export function AiQuoteHeroBanner() {
  const FULL = "Web design + hosting: ₦180,000";
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setChars(c => (c >= FULL.length ? c : c + 1)), 90);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Pause briefly once the full line has typed out, then reset and re-type.
  useEffect(() => {
    if (chars !== FULL.length) return;
    const t = setTimeout(() => setChars(0), 1400);
    return () => clearTimeout(t);
  }, [chars]);

  return (
    <FeatureHeroShell
      href="/seller/quotes/new"
      badge="SELLER TOOL"
      badgeColor="#818cf8"
      title={<>AI Quotes in <span style={{ color: "#818cf8" }}>Seconds</span></>}
      subtitle="Describe the job — get a polished, ready-to-send quote your customer can pay instantly."
      gradient="linear-gradient(135deg, #0e1130 0%, #1a1f4d 60%, #0e1130 100%)"
      ctaLabel="Try AI Quote"
      ctaColor="#fbbf24"
      visual={
        <div
          className="rounded-2xl px-4 py-3 font-mono text-left"
          style={{ background: "#05061a", border: "1px solid #818cf855", width: "100%", maxWidth: 220 }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Wand2 size={12} color="#818cf8" />
            <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 800, letterSpacing: "0.05em" }}>ZIVA QUOTE</span>
          </div>
          <p style={{ fontSize: 11, color: "#c7d2fe", lineHeight: 1.5, minHeight: 32 }}>
            {FULL.slice(0, chars)}
            <span className={chars < FULL.length ? "animate-pulse" : "opacity-0"}>▍</span>
          </p>
        </div>
      }
    />
  );
}
