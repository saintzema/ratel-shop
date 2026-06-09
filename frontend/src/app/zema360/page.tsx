"use client";

/**
 * ZEMA 360 — Autonomous Commerce OS
 * fairprice.ng/zema360
 *
 * Design system:
 *   Background  #080810 (near-black)
 *   Surface     #0f0f1a (card bg)
 *   Border      #1e1e3a (glass border)
 *   Accent      #10b981 (FairPrice emerald)
 *   Accent glow rgba(16,185,129,0.15)
 *   Text        #f8fafc
 *   Muted       #94a3b8
 *   Typography  Space Grotesk (heading) / Inter (body, already loaded)
 */

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import {
    Bot, Zap, ShieldCheck, TrendingUp, Package, DollarSign,
    MessageSquare, ArrowRight, CheckCircle, Copy, Check,
    Globe, Lock, Layers, Activity, ChevronRight, Sparkles,
    BarChart3, Clock, Users, Cpu, Network, Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Animation helpers — framer-motion v12 type-safe variants
// ─────────────────────────────────────────────────────────────────────────────

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// Container: stagger children on scroll-reveal
const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.section
            ref={ref}
            id={id}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={staggerContainer}
            className={cn("relative", className)}
        >
            {children}
        </motion.section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable card (glassmorphism dark)
// ─────────────────────────────────────────────────────────────────────────────

function GlassCard({
    children,
    className,
    glow,
}: {
    children: React.ReactNode;
    className?: string;
    glow?: boolean;
}) {
    return (
        <motion.div
            variants={fadeUp}
            className={cn(
                "relative rounded-2xl border border-[#1e1e3a] bg-[#0f0f1a] p-6 transition-all duration-300",
                "hover:border-emerald-500/40 hover:shadow-[0_0_32px_rgba(16,185,129,0.08)]",
                glow && "shadow-[0_0_48px_rgba(16,185,129,0.05)]",
                className,
            )}
        >
            {children}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Code block
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_REQUEST = `POST /api/zema360/process-order
Authorization: Bearer zema_live_sk_...

{
  "productId": "prod_iphone16pro",
  "buyerId":   "usr_ngozi_adeyemi",
  "sellerId":  "sel_techmart_abuja",
  "quantity":  2,
  "proposedPrice": 1_150_000
}`;

const SAMPLE_RESPONSE = `{
  "runId":    "zema-run-1749238412-k7a2f",
  "phase":    "done",
  "decision": "approve",
  "agents": [
    { "agent": "sales",     "stance": "approve", "riskScore": 22 },
    { "agent": "inventory", "stance": "approve", "riskScore": 18 },
    { "agent": "finance",   "stance": "approve", "riskScore": 31 }
  ],
  "offer": {
    "price":    1150000,
    "currency": "NGN",
    "terms":    "Standard 30-day escrow"
  },
  "requiresHuman": false,
  "durationMs": 1842
}`;

function CodeBlock({ code, language }: { code: string; language: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative rounded-xl border border-[#1e1e3a] bg-[#050509] overflow-hidden font-mono text-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e3a]">
                <span className="text-[#94a3b8] text-xs uppercase tracking-widest">{language}</span>
                <button
                    onClick={copy}
                    className="flex items-center gap-1.5 text-[#94a3b8] hover:text-emerald-400 transition-colors cursor-pointer"
                    aria-label="Copy code"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[#e2e8f0] leading-relaxed whitespace-pre text-xs">
                {code}
            </pre>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS = [
    {
        name: "Sales Agent",
        icon: TrendingUp,
        color: "text-emerald-400",
        ring: "ring-emerald-500/30",
        bg: "bg-emerald-500/10",
        mandate: "Maximise deal conversion. Proposes price, terms, and credit packages that close deals without breaching Finance's floor.",
        tools: ["create_negotiation", "send_whatsapp"],
        stance: "approve",
    },
    {
        name: "Inventory Agent",
        icon: Package,
        color: "text-sky-400",
        ring: "ring-sky-500/30",
        bg: "bg-sky-500/10",
        mandate: "Guards fulfilment reality. Confirms seller has stock, lead times are honest, and the quantity can ship.",
        tools: ["get_inventory", "set_tracking"],
        stance: "approve",
    },
    {
        name: "Finance Agent",
        icon: DollarSign,
        color: "text-violet-400",
        ring: "ring-violet-500/30",
        bg: "bg-violet-500/10",
        mandate: "Protects margin and buyer credit risk. Assigns risk scores 0–100. Risk ≥ 60 escalates to human approval.",
        tools: ["release_escrow", "paystack_payout", "process_refund"],
        stance: "approve",
    },
];

const MCP_TOOLS = [
    { name: "get_order",          icon: Activity,    desc: "Live order + escrow state" },
    { name: "get_inventory",      icon: Package,     desc: "Stock level & pricing" },
    { name: "set_tracking",       icon: Globe,       desc: "Write shipment data" },
    { name: "release_escrow",     icon: Lock,        desc: "Release held funds" },
    { name: "paystack_payout",    icon: DollarSign,  desc: "Settle seller via Paystack" },
    { name: "process_refund",     icon: ArrowRight,  desc: "Refund buyer instantly" },
    { name: "send_whatsapp",      icon: MessageSquare, desc: "HITL approval + comms" },
    { name: "create_negotiation", icon: Users,       desc: "Open price negotiation" },
];

const PIPELINE_STEPS = [
    { label: "New Order",     icon: ShoppingIcon,    color: "bg-slate-700" },
    { label: "Agent Panel",   icon: Cpu,             color: "bg-emerald-900" },
    { label: "Risk Score",    icon: BarChart3,       color: "bg-sky-900" },
    { label: "HITL WhatsApp", icon: MessageSquare,   color: "bg-violet-900" },
    { label: "Escrow Release",icon: Lock,            color: "bg-amber-900" },
    { label: "Payout",        icon: DollarSign,      color: "bg-rose-900" },
];

function ShoppingIcon(props: any) {
    return <Package {...props} />;
}

const METRICS = [
    { value: "3", label: "Qwen Agents", sub: "Sales · Inventory · Finance", icon: Bot },
    { value: "8", label: "MCP Tools",   sub: "Real store operations",       icon: Webhook },
    { value: "<2s",label: "Avg Run",    sub: "Full pipeline latency",       icon: Clock },
];

const FEATURES = [
    { icon: Sparkles,   title: "Qwen-Powered",      body: "qwen-max + qwen-plus on Alibaba Cloud Model Studio (Singapore MaaS endpoint). Tool-calling, multi-round reasoning, streaming." },
    { icon: Network,    title: "MCP Integration",   body: "Python MCP server exposes 8 real FairPrice ops tools. Agents call get_order, release_escrow, paystack_payout via the standard protocol." },
    { icon: ShieldCheck,title: "Human-in-the-Loop", body: "Risk ≥ 60 → WhatsApp approval to +2348162816305. Reply 'approve <id>' or 'reject <id>' to resume or cancel the pipeline." },
    { icon: Layers,     title: "Persistent Memory", body: "Per-seller and per-buyer deal history on Alibaba Cloud OSS. Every agent run builds context that informs future risk scoring." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Zema360Page() {
    const [activeTab, setActiveTab] = useState<"request" | "response">("request");

    return (
        <div
            className="min-h-screen bg-[#080810] text-[#f8fafc] overflow-x-hidden"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* Ambient glow orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
                <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            {/* ── Navbar ────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e3a]/60 bg-[#080810]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            ZEMA <span className="text-emerald-400">360</span>
                        </span>
                        <span className="hidden sm:inline text-xs text-[#94a3b8] border border-[#1e1e3a] rounded-full px-2.5 py-0.5 ml-1">
                            by FairPrice.ng
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm text-[#94a3b8] hover:text-white transition-colors hidden md:block">
                            FairPrice.ng
                        </Link>
                        <a
                            href="#request-access"
                            className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                            Get Access
                        </a>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 pt-24 pb-32 space-y-32">

                {/* ── Hero ──────────────────────────────────────────────── */}
                <Section className="pt-16 text-center">
                    <motion.div variants={fadeUp} className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-4 py-1.5 text-sm text-emerald-400 mb-8">
                        <Sparkles className="w-3.5 h-3.5" />
                        Powered by Qwen on Alibaba Cloud · Track 4 Autopilot Agent
                    </motion.div>

                    <motion.h1
                        variants={fadeUp}
                       
                        className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Your commerce{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                            runs itself.
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
                        ZEMA 360 is an autonomous multi-agent operating system for Nigerian e-commerce.
                        Three Qwen agents — Sales, Inventory, Finance — negotiate every deal, release escrow,
                        settle payouts, and escalate edge cases to a human via WhatsApp.
                    </motion.p>

                    <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
                        <a
                            href="#api"
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                        >
                            See the API <ArrowRight className="w-4 h-4" />
                        </a>
                        <a
                            href="#how-it-works"
                            className="flex items-center gap-2 border border-[#1e1e3a] hover:border-emerald-500/40 text-[#94a3b8] hover:text-white font-semibold px-6 py-3 rounded-xl transition-all cursor-pointer"
                        >
                            How it works
                        </a>
                    </motion.div>

                    {/* Trust bar */}
                    <motion.div variants={fadeUp} className="mt-16 flex flex-wrap justify-center items-center gap-8 text-[#94a3b8] text-sm">
                        {["Alibaba Cloud OSS", "Qwen qwen-max", "Paystack Payouts", "Meta WhatsApp API", "MCP Protocol"].map(t => (
                            <div key={t} className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                {t}
                            </div>
                        ))}
                    </motion.div>
                </Section>

                {/* ── Metrics bento ──────────────────────────────────────── */}
                <Section>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {METRICS.map((m, i) => (
                            <GlassCard key={m.label} glow={i === 0} className="text-center">
                                <m.icon className="w-7 h-7 text-emerald-400 mx-auto mb-3" />
                                <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    {m.value}
                                </div>
                                <div className="font-semibold text-[#f8fafc] mb-1">{m.label}</div>
                                <div className="text-sm text-[#94a3b8]">{m.sub}</div>
                            </GlassCard>
                        ))}
                    </div>
                </Section>

                {/* ── Agent Ops Squad ─────────────────────────────────────── */}
                <Section>
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        The Ops Squad
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
                        Three Qwen specialists negotiate every deal from their own mandate. They run in parallel, reconcile positions, and escalate to a human only when they can't agree.
                    </motion.p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {AGENTS.map((agent, i) => (
                            <GlassCard key={agent.name} className="flex flex-col gap-4">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center ring-1", agent.bg, agent.ring)}>
                                    <agent.icon className={cn("w-6 h-6", agent.color)} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white">{agent.name}</h3>
                                        <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">qwen-plus</span>
                                    </div>
                                    <p className="text-sm text-[#94a3b8] leading-relaxed">{agent.mandate}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-[#1e1e3a]">
                                    <div className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">MCP tools</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {agent.tools.map(t => (
                                            <span key={t} className="text-xs font-mono bg-[#1e1e3a] text-[#94a3b8] rounded px-2 py-0.5">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </Section>

                {/* ── How it works ────────────────────────────────────────── */}
                <Section id="how-it-works">
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Full pipeline, zero babysitting
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-[#94a3b8] text-center mb-14 max-w-xl mx-auto">
                        From new order to settled payout — ZEMA orchestrates every step on Alibaba Function Compute.
                    </motion.p>

                    <div className="relative">
                        {/* Connector line */}
                        <div className="hidden md:block absolute top-10 left-[8.33%] right-[8.33%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" aria-hidden />

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            {PIPELINE_STEPS.map((step, i) => (
                                <motion.div
                                    key={step.label}
                                    variants={fadeUp}
                                   
                                    className="flex flex-col items-center gap-3 text-center"
                                >
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border border-[#1e1e3a]", step.color)}>
                                        <step.icon className="w-7 h-7 text-white/80" />
                                    </div>
                                    <span className="text-xs text-[#94a3b8] font-medium leading-tight">{step.label}</span>
                                    {i < PIPELINE_STEPS.length - 1 && (
                                        <ChevronRight className="hidden md:block absolute text-emerald-500/30 w-4 h-4 top-6 -right-2" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* HITL callout */}
                    <motion.div variants={fadeUp} className="mt-10 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 flex flex-col md:flex-row gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-white mb-1">Human-in-the-Loop Checkpoint</div>
                            <p className="text-sm text-[#94a3b8]">
                                When Finance's risk score ≥ 60 or any agent vetoes, ZEMA pauses and sends a structured WhatsApp approval request to
                                {" "}<span className="font-mono text-violet-300">+2348162816305</span>.
                                Reply{" "}<span className="font-mono bg-[#1e1e3a] px-1.5 py-0.5 rounded text-emerald-400">approve &lt;id&gt;</span>
                                {" "}or{" "}
                                <span className="font-mono bg-[#1e1e3a] px-1.5 py-0.5 rounded text-rose-400">reject &lt;id&gt;</span>
                                {" "}to resume or cancel the pipeline. The inbound webhook handles it automatically.
                            </p>
                        </div>
                    </motion.div>
                </Section>

                {/* ── MCP Tools bento ─────────────────────────────────────── */}
                <Section>
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        8 real store tools via MCP
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
                        A Python MCP server on Alibaba Function Compute exposes FairPrice's live database, escrow engine, and Paystack as typed tools that any Qwen agent can call.
                    </motion.p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {MCP_TOOLS.map((tool, i) => (
                            <GlassCard key={tool.name} className="flex items-start gap-3 py-4">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <tool.icon className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-xs font-mono text-white mb-0.5">{tool.name}</div>
                                    <div className="text-xs text-[#64748b]">{tool.desc}</div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </Section>

                {/* ── Enterprise API ───────────────────────────────────────── */}
                <Section id="api">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                One endpoint.<br />
                                <span className="text-emerald-400">Your whole back-office.</span>
                            </motion.h2>
                            <motion.p variants={fadeUp} className="text-[#94a3b8] mb-8 leading-relaxed">
                                Scale-tier sellers get API access. Submit an order payload, get back a full multi-agent run — positions, consensus offer, risk score, and a HITL checkpoint if needed.
                            </motion.p>

                            <motion.ul variants={staggerContainer} className="space-y-3">
                                {[
                                    "Bearer API key auth (Scale plan)",
                                    "Inline 3-agent Qwen panel",
                                    "Structured JSON response with full audit log",
                                    "WhatsApp approval for high-risk orders",
                                    "Avg response < 2 seconds",
                                ].map((f, i) => (
                                    <motion.li key={f} variants={fadeUp} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {f}
                                    </motion.li>
                                ))}
                            </motion.ul>
                        </div>

                        <motion.div variants={fadeUp} className="space-y-3">
                            {/* Tab switcher */}
                            <div className="flex gap-2 p-1 bg-[#0f0f1a] rounded-xl w-fit border border-[#1e1e3a]">
                                {(["request", "response"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer capitalize",
                                            activeTab === tab
                                                ? "bg-emerald-500 text-white"
                                                : "text-[#94a3b8] hover:text-white"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CodeBlock
                                        code={activeTab === "request" ? SAMPLE_REQUEST : SAMPLE_RESPONSE}
                                        language={activeTab === "request" ? "HTTP Request" : "JSON Response"}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </Section>

                {/* ── Key features bento ──────────────────────────────────── */}
                <Section>
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Built on real infrastructure
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {FEATURES.map((f, i) => (
                            <GlassCard key={f.title} className="flex gap-5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                                    <f.icon className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1.5">{f.title}</h3>
                                    <p className="text-sm text-[#94a3b8] leading-relaxed">{f.body}</p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </Section>

                {/* ── Pricing teaser ───────────────────────────────────────── */}
                <Section>
                    <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Packaged for your scale
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
                        ZEMA 360 is available to FairPrice.ng Scale-plan sellers. API keys are issued from your seller dashboard — no integration work, just one endpoint.
                    </motion.p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { plan: "Starter",     price: "Free",   features: ["Manual order management", "Ziva AI assistant", "Escrow protection"],            cta: "Current plan", active: false },
                            { plan: "Growth",      price: "₦25k/mo",features: ["Everything in Starter", "Auto-release escrow", "WhatsApp notifications"],       cta: "Upgrade",      active: false },
                            { plan: "Scale",       price: "₦75k/mo",features: ["Everything in Growth", "ZEMA 360 API access", "Multi-agent pipeline", "Priority SLA"], cta: "Get Access", active: true },
                        ].map((tier, i) => (
                            <GlassCard
                                key={tier.plan}
                               
                                glow={tier.active}
                                className={cn(
                                    "flex flex-col",
                                    tier.active && "border-emerald-500/60 ring-1 ring-emerald-500/20"
                                )}
                            >
                                {tier.active && (
                                    <div className="text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3 py-1 w-fit mb-4">
                                        ZEMA 360 Included
                                    </div>
                                )}
                                <div className="font-bold text-xl text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{tier.plan}</div>
                                <div className="text-3xl font-bold text-emerald-400 mb-5">{tier.price}</div>
                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {tier.features.map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href={tier.active ? "#request-access" : "https://fairprice.ng/seller/subscription"}
                                    className={cn(
                                        "w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all cursor-pointer",
                                        tier.active
                                            ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                                            : "border border-[#1e1e3a] hover:border-emerald-500/40 text-[#94a3b8] hover:text-white"
                                    )}
                                >
                                    {tier.cta}
                                </a>
                            </GlassCard>
                        ))}
                    </div>
                </Section>

                {/* ── CTA ─────────────────────────────────────────────────── */}
                <Section id="request-access">
                    <GlassCard glow className="text-center py-16 px-8 border-emerald-500/30">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-8 h-8 text-emerald-400" />
                        </div>
                        <motion.h2
                            variants={fadeUp}
                            className="text-4xl md:text-5xl font-bold mb-4"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Ready to autopilot?
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-[#94a3b8] max-w-lg mx-auto mb-10">
                            ZEMA 360 is live on FairPrice.ng. Scale-plan sellers can request API access today.
                            Enterprise deployments and white-label licensing available — contact us on WhatsApp.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
                            <Link
                                href="/seller/subscription"
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors cursor-pointer"
                            >
                                Upgrade to Scale <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="https://wa.me/2348162816305?text=Hi%2C+I%27d+like+to+learn+more+about+ZEMA+360"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 border border-[#1e1e3a] hover:border-emerald-500/40 text-[#94a3b8] hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all cursor-pointer"
                            >
                                <MessageSquare className="w-4 h-4" />
                                WhatsApp us
                            </a>
                        </motion.div>
                    </GlassCard>
                </Section>
            </main>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="border-t border-[#1e1e3a] py-8 text-center text-sm text-[#64748b]">
                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span>ZEMA 360 by <Link href="/" className="hover:text-emerald-400 transition-colors">FairPrice.ng</Link></span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span>Submitted to: <span className="text-[#94a3b8]">Global AI Hackathon — Qwen Cloud Track 4</span></span>
                        <span>Built on Alibaba Cloud</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
