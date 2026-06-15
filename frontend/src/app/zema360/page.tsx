"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Package,
  Truck,
  DollarSign,
  MessageSquare,
  Shield,
  Zap,
  CheckCircle,
  Code2,
  Globe,
  Lock,
  ChevronRight,
  Play,
  Cpu,
  Network,
  BarChart3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentStep = { id: string; label: string; status: "waiting" | "running" | "done" };

// ── Constants ─────────────────────────────────────────────────────────────────
const PIPELINE_STEPS: AgentStep[] = [
  { id: "order",       label: "New Order",       status: "waiting" },
  { id: "inventory",   label: "Inventory Agent", status: "waiting" },
  { id: "fulfillment", label: "Fulfil Agent",    status: "waiting" },
  { id: "hitl",        label: "HITL Approval",   status: "waiting" },
  { id: "finance",     label: "Finance Agent",   status: "waiting" },
  { id: "comms",       label: "Comms Agent",     status: "waiting" },
  { id: "done",        label: "Complete",        status: "waiting" },
];

const AGENTS = [
  {
    icon: Package,
    name: "Inventory Agent",
    color: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-500/30",
    bg: "bg-emerald-500/10",
    desc: "Decrements stock, flags low inventory, prevents overselling in real time.",
    tools: ["get_inventory", "update_stock", "flag_reorder"],
  },
  {
    icon: Truck,
    name: "Fulfillment Agent",
    color: "from-blue-500 to-indigo-600",
    ring: "ring-blue-500/30",
    bg: "bg-blue-500/10",
    desc: "Assigns carriers, generates tracking IDs, sends live updates to buyers.",
    tools: ["set_tracking", "assign_carrier", "send_whatsapp"],
  },
  {
    icon: DollarSign,
    name: "Finance Agent",
    color: "from-violet-500 to-purple-600",
    ring: "ring-violet-500/30",
    bg: "bg-violet-500/10",
    desc: "Manages escrow, triggers Paystack payouts, processes refunds — after human sign-off.",
    tools: ["release_escrow", "paystack_payout", "process_refund"],
  },
];

const STATS = [
  { value: "23s",  label: "Avg. order-to-fulfillment", sub: "vs 8–12 min manually" },
  { value: "3",    label: "Specialized AI agents",     sub: "Inventory · Fulfillment · Finance" },
  { value: "100%", label: "Human approval",            sub: "Before any money moves" },
  { value: "0",    label: "False payouts",             sub: "In production testing" },
];

const PRICING = [
  {
    name: "Starter",
    price: "Free",
    sub: "Forever",
    highlight: false,
    features: ["Up to 50 orders/mo", "Inventory + Comms agents", "WhatsApp notifications", "Dashboard access"],
    cta: "Get Started",
  },
  {
    name: "Scale",
    price: "₦25,000",
    sub: "/ month",
    highlight: true,
    features: ["Unlimited orders", "Full 3-agent Ops Squad", "HITL WhatsApp approvals", "Enterprise API access", "Per-seller memory", "Priority support"],
    cta: "Request Access",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function PipelineViz() {
  const [steps, setSteps] = useState<AgentStep[]>(PIPELINE_STEPS);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || running) return;
    setRunning(true);

    const run = async () => {
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, i === 3 ? 900 : 550));
        setSteps(prev => prev.map((s, idx) =>
          idx < i ? { ...s, status: "done" } :
          idx === i ? { ...s, status: "running" } : s
        ));
      }
      await new Promise(r => setTimeout(r, 600));
      setSteps(prev => prev.map(s => ({ ...s, status: "done" })));
      await new Promise(r => setTimeout(r, 3000));
      setSteps(PIPELINE_STEPS);
      setRunning(false);
    };
    run();
  }, [inView]);

  const colors: Record<AgentStep["status"], string> = {
    waiting: "bg-white/5 border-white/10 text-white/30",
    running: "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20",
    done:    "bg-emerald-900/40 border-emerald-600/50 text-emerald-400",
  };

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-2 md:gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 md:gap-2">
          <motion.div
            animate={step.status === "running" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ repeat: step.status === "running" ? Infinity : 0, duration: 0.8 }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-500 ${colors[step.status]}`}
          >
            {step.status === "running" && (
              <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
            )}
            {step.status === "done" && <CheckCircle className="inline w-3 h-3 mr-1" />}
            {step.label}
          </motion.div>
          {i < steps.length - 1 && (
            <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-colors duration-500 ${step.status === "done" ? "text-emerald-500" : "text-white/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function AgentCard({ agent, index }: { agent: typeof AGENTS[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const Icon = agent.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 ring-1 ${agent.ring} hover:bg-white/[0.06] transition-all duration-300 group`}
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.color} mb-4 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <h3 className="text-lg font-black text-white mb-2">{agent.name}</h3>
      <p className="text-sm text-white/50 leading-relaxed mb-4">{agent.desc}</p>

      <div className="flex flex-wrap gap-2">
        {agent.tools.map(t => (
          <span key={t} className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg ${agent.bg} text-white/60`}>
            {t}()
          </span>
        ))}
      </div>

      {/* Subtle glow on hover */}
      <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${agent.color} blur-2xl -z-10 scale-90`} />
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Zema360Page() {
  const [copied, setCopied] = useState(false);

  const codeSnippet = `curl -X POST https://fairprice.ng/api/zema360/process-order \\
  -H "Authorization: Bearer zema_sk_live_••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORD-2891",
    "seller_id": "sel_adunola_stores",
    "auto_approve_under": 50000
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-500/6 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/4 rounded-full blur-[140px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm tracking-tight">
              Zema<span className="text-emerald-400">360</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#agents" className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors hidden md:block">Agents</a>
            <a href="#how" className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors hidden md:block">How It Works</a>
            <a href="#pricing" className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors hidden md:block">Pricing</a>
            <Link href="/" className="text-xs font-bold px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              FairPrice.ng ↗
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-16">

        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto px-6 pt-28 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8">
              <Cpu className="w-3.5 h-3.5" />
              Powered by Qwen — Alibaba Cloud AI
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Commerce that runs
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                itself.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
              ZEMA 360 is an autonomous multi-agent OS that processes orders, manages inventory,
              coordinates fulfillment, and releases escrow — end to end, with a single WhatsApp approval from you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#pricing"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/25"
              >
                Request Access <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" /> View Demo
              </button>
            </div>
          </motion.div>

          {/* Pipeline animation */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-16 p-6 rounded-3xl border border-white/8 bg-white/[0.02] backdrop-blur-sm max-w-4xl mx-auto"
          >
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Live Pipeline Simulation</p>
            <PipelineViz />
          </motion.div>
        </section>

        {/* ── Stats ── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-black text-emerald-400 mb-1">{s.value}</div>
                <div className="text-xs font-bold text-white/70 mb-1">{s.label}</div>
                <div className="text-[10px] text-white/30">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Agents ── */}
        <section id="agents" className="max-w-7xl mx-auto px-6 pb-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">
              <Network className="w-3 h-3" /> Ops Squad
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Three agents. One pipeline.</h2>
            <p className="text-white/40 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              Each agent specializes in one domain and hands off to the next. They share context, not responsibilities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {AGENTS.map((a, i) => <AgentCard key={a.name} agent={a} index={i} />)}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how" className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" /> Human in the Loop
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                The agent pauses<br />before money moves.
              </h2>
              <p className="text-white/50 max-w-xl text-sm leading-relaxed mb-10">
                ZEMA 360 never releases escrow or initiates a Paystack payout autonomously.
                Every financial action requires a one-tap WhatsApp approval. This isn't a limitation —
                it's why enterprise finance directors trust it.
              </p>

              {/* WhatsApp mockup */}
              <div className="max-w-sm mx-auto md:mx-0 bg-[#0a1929] rounded-3xl p-5 border border-white/5 font-mono text-sm">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">ZEMA 360</div>
                    <div className="text-[10px] text-white/30">AI Commerce Assistant</div>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 text-white/70 leading-relaxed">
                    🔔 <span className="font-bold text-white">Approval Required</span><br /><br />
                    Order: <span className="text-emerald-400">ORD-2891</span><br />
                    Buyer: Chukwuemeka Okafor<br />
                    Amount: <span className="text-emerald-400 font-bold">₦47,000</span><br />
                    Action: Escrow release + Paystack payout<br /><br />
                    Reply: <span className="bg-emerald-500/20 text-emerald-300 px-1 rounded">approve 2891</span> or <span className="bg-red-500/20 text-red-300 px-1 rounded">reject 2891</span>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-emerald-600 rounded-2xl rounded-tr-sm px-3 py-2 text-white text-xs">
                      approve 2891 ✓✓
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 text-white/70 text-xs leading-relaxed">
                    ✅ <span className="font-bold text-emerald-400">Approved!</span> Escrow released.
                    Paystack transfer queued to Adunola Stores · Zenith ****3847
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Enterprise API ── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">
                <Code2 className="w-3 h-3" /> Enterprise API
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Plug your operations<br />into the grid.
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Send an order to ZEMA 360 via API and the full Ops Squad handles it —
                inventory, fulfillment, escrow, payout, notifications — returning a structured
                audit log of every agent decision.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: Lock, text: "Bearer token auth — issued per seller from Scale dashboard" },
                  { icon: BarChart3, text: "Full structured JSON audit log per agent step" },
                  { icon: Globe, text: "Auto-approve threshold — skip HITL for low-value orders" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 text-sm text-white/50">
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3 h-3 text-emerald-400" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Code block */}
            <div className="relative rounded-2xl bg-[#0d1117] border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <button
                  onClick={handleCopy}
                  className="text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-5 text-xs text-white/60 leading-relaxed overflow-x-auto font-mono">
                <code>{codeSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── Qwen + Alibaba badge ── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 md:p-10 text-center">
            <div className="text-xs font-bold text-emerald-400/60 uppercase tracking-widest mb-3">Built on</div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50 font-bold">
              <span>Qwen qwen3-max</span>
              <span className="text-white/20">·</span>
              <span>Qwen qwen3-vl-plus</span>
              <span className="text-white/20">·</span>
              <span>Alibaba DashScope</span>
              <span className="text-white/20">·</span>
              <span>Alibaba Function Compute</span>
              <span className="text-white/20">·</span>
              <span>Alibaba OSS</span>
            </div>
            <p className="text-white/30 text-xs mt-4 max-w-lg mx-auto">
              Agent orchestrator runs on Alibaba Cloud Function Compute in Singapore.
              All documents and seller memory files stored on Alibaba OSS.
            </p>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Simple pricing.</h2>
            <p className="text-white/40 text-sm">Start free. Scale when you need the full Ops Squad.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-8 relative overflow-hidden ${
                  plan.highlight
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-white/8 bg-white/[0.02]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Popular
                  </div>
                )}
                <div className="text-sm font-black text-white/50 uppercase tracking-widest mb-2">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-white/30 text-sm mb-1.5">{plan.sub}</span>
                </div>
                <ul className="space-y-3 mt-6 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hello@zemaai.com?subject=ZEMA360 Access Request"
                  className={`block text-center py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
              Ready to put your commerce on autopilot?
            </h2>
            <p className="text-white/40 text-sm mb-8 max-w-md mx-auto">
              Join the sellers already running ZEMA 360 on FairPrice.ng — Nigeria's escrow marketplace for the informal economy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all shadow-xl shadow-emerald-500/25"
              >
                Go to FairPrice.ng <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:hello@zemaai.com?subject=ZEMA360 Access Request"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Request Enterprise Access
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
            <span>© 2026 ZEMA Technologies · FairPrice.ng</span>
            <div className="flex items-center gap-6">
              <Link href="/features" className="hover:text-white/40 transition-colors">Features</Link>
              <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy</Link>
              <a href="https://github.com/saintzema/ratel-shop" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
