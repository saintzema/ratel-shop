"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, UploadCloud, Loader2, Save, Files, Download, PenLine, RefreshCw, X, FileSignature, Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicantType } from "./Step1-ApplicantType";
import { BoardResolutionGenerator, type BoardResolutionData } from "./BoardResolutionGenerator";

// A doc value can be a single File, an array of Files, or null
export type DocValue = File | File[] | null;
export type DocumentUploads = Record<string, DocValue>;

// Signature stored as data-URL or null
export type SignatureData = string | null;

interface DocDef {
    key: string;
    label: string;
    hint: string;
    accept: string;
    multiple?: boolean;
}

const SALARY_DOCS: DocDef[] = [
    { key: 'bankStatement', label: '6 Months Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'payslip', label: 'Recent Payslip (3–6 months)', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'confirmationLetter', label: 'Confirmation / Employment Letter', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'altbankForm', label: 'Filled AltBank Salary Form', hint: 'Download below, fill & upload here', accept: '.pdf,.jpg,.jpeg,.png' },
];

const BUSINESS_DOCS: DocDef[] = [
    { key: 'cac', label: 'CAC Documents (Form 1 & 2)', hint: 'Select both forms at once (PDF or image)', accept: '.pdf,.jpg,.jpeg,.png', multiple: true },
    { key: 'auditedFinancials', label: '1–2 Years Audited Financials', hint: 'PDF, Excel or CSV — or generate below', accept: '.pdf,.xlsx,.xls,.csv' },
    { key: 'cashFlowProjection', label: 'Cash Flow Projection', hint: 'PDF, Excel or CSV — or generate below', accept: '.pdf,.xlsx,.xls,.csv' },
    { key: 'bankStatement', label: '1 Year Bank Statement', hint: 'PDF or image', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'altbankForm', label: 'Filled AltBank Business Form', hint: 'Download below, fill & upload here', accept: '.pdf,.jpg,.jpeg,.png' },
];

const ALTBANK_FORMS: Record<ApplicantType, { label: string; path: string }> = {
    salary_earner: {
        label: 'AltBank Salary Earner Form',
        path: '/assets/financing/altpower-salary-form.pdf',
    },
    business_owner: {
        label: 'AltBank Business Owner Form',
        path: '/assets/financing/altpower-business-form.pdf',
    },
};

function fileCount(val: DocValue): number {
    if (!val) return 0;
    return Array.isArray(val) ? val.length : 1;
}

function fileName(val: DocValue): string {
    if (!val) return '';
    if (Array.isArray(val)) {
        return val.length === 1 ? val[0].name : `${val.length} files selected`;
    }
    return val.name;
}

// ─── Signature Canvas Component ───────────────────────────────────────────────
interface SignatureCanvasProps {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
    existingSignature: SignatureData;
}

function SignatureCanvas({ onSave, onClear, existingSignature }: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [showPad, setShowPad] = useState(false);

    const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        // No scaling needed — canvas.style.width/height now exactly matches rect
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        e.preventDefault();
        isDrawing.current = true;
        lastPos.current = getPos(e, canvas);
    }, []);

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        e.preventDefault();

        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
        setHasDrawn(true);
    }, []);

    const endDraw = useCallback(() => {
        isDrawing.current = false;
        lastPos.current = null;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !showPad) return;

        // Measure CSS size BEFORE changing canvas dimensions so getBoundingClientRect is accurate
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Set pixel buffer to match physical pixels
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        // CSS size stays as is (set by parent layout)
        canvas.style.width  = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);
        }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', endDraw);

        return () => {
            canvas.removeEventListener('mousedown', startDraw);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', endDraw);
            canvas.removeEventListener('mouseleave', endDraw);
            canvas.removeEventListener('touchstart', startDraw);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', endDraw);
        };
    }, [showPad, startDraw, draw, endDraw]);

    const handleClearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const w = parseFloat(canvas.style.width) || canvas.width;
        const h = parseFloat(canvas.style.height) || canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        setHasDrawn(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        setShowPad(false);
        setHasDrawn(false);
    };

    const handleClearSignature = () => {
        onClear();
        setShowPad(false);
    };

    return (
        <div className="mt-3">
            {existingSignature ? (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-emerald-700">Signature captured</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setShowPad(true)}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            >
                                Re-sign
                            </button>
                            <button
                                onClick={handleClearSignature}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    <img src={existingSignature} alt="Your signature" className="max-h-16 border border-gray-100 rounded-lg bg-white" />
                </div>
            ) : (
                <button
                    onClick={() => setShowPad(true)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                >
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <PenLine className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-gray-700">Add Your Signature</p>
                        <p className="text-[10px] text-gray-400">Sign directly on screen — applied to your application</p>
                    </div>
                </button>
            )}

            {/* Signature pad modal overlay */}
            {showPad && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <div>
                                <h4 className="text-sm font-black text-gray-900">Sign Your Application</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">Draw your signature below</p>
                            </div>
                            <button onClick={() => setShowPad(false)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden" style={{ height: 180 }}>
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full cursor-crosshair touch-none"
                                    style={{ display: 'block' }}
                                />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-xs text-gray-300 font-medium">Sign here</p>
                                    </div>
                                )}
                                {/* Baseline */}
                                <div className="absolute bottom-10 left-6 right-6 border-b border-gray-200 pointer-events-none" />
                            </div>

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleClearCanvas}
                                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
                                >
                                    <RefreshCw className="h-3 w-3" /> Clear
                                </button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasDrawn}
                                    className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                                >
                                    Save Signature
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props {
    applicantType: ApplicantType;
    initialDocuments: DocumentUploads;
    productName?: string;
    loanAmount?: number;
    tenureMonths?: number;
    /** Calculated monthly repayment from the chosen contract — auto-fills the wizard */
    monthlyPayment?: number;
    onNext: (documents: DocumentUploads, signature: SignatureData, boardResolution?: BoardResolutionData) => void;
    onBack: () => void;
    onSaveProgress: (documents: DocumentUploads) => Promise<void>;
}

export function Step3DocumentUpload({ applicantType, initialDocuments, productName = "Product", loanAmount = 0, tenureMonths = 12, monthlyPayment, onNext, onBack, onSaveProgress }: Props) {
    const [documents, setDocuments] = useState<DocumentUploads>(initialDocuments);
    const [signature, setSignature] = useState<SignatureData>(null);
    const [boardResolution, setBoardResolution] = useState<BoardResolutionData | null>(null);
    const [showBoardResolutionGenerator, setShowBoardResolutionGenerator] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [showFinancialWizard, setShowFinancialWizard] = useState(false);
    const [wizardTarget, setWizardTarget] = useState<'auditedFinancials' | 'cashFlowProjection'>('auditedFinancials');
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardGenerating, setWizardGenerating] = useState(false);
    const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>({});
    const [showValidation, setShowValidation] = useState(false);

    const requiredDocs = applicantType === 'salary_earner' ? SALARY_DOCS : BUSINESS_DOCS;
    const uploadedCount = requiredDocs.filter(d => fileCount(documents[d.key]) > 0).length;
    const boardResolutionRequired = applicantType === 'business_owner';
    const boardResolutionDone = !boardResolutionRequired || !!boardResolution;
    const allUploaded = uploadedCount === requiredDocs.length && !!signature && boardResolutionDone;

    const altbankForm = ALTBANK_FORMS[applicantType];

    const handleFile = (key: string, multiple: boolean | undefined, files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (multiple) {
            setDocuments(prev => ({ ...prev, [key]: Array.from(files) }));
        } else {
            setDocuments(prev => ({ ...prev, [key]: files[0] }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveProgress(documents);
        setSavedAt(new Date());
        setIsSaving(false);
    };

    const openWizard = (target: 'auditedFinancials' | 'cashFlowProjection') => {
        setWizardTarget(target);
        setWizardStep(0);
        // Pre-populate loan repayment from the selected contract so user doesn't have to type it
        const initialAnswers: Record<string, string> = {};
        if (target === 'cashFlowProjection' && monthlyPayment && monthlyPayment > 0) {
            initialAnswers['loanRepayment'] = String(Math.round(monthlyPayment));
        }
        setWizardAnswers(initialAnswers);
        setShowFinancialWizard(true);
    };

    // Questions shown in the wizard — slightly different per target
    const WIZARD_QUESTIONS = wizardTarget === 'auditedFinancials' ? [
        { key: 'revenue', label: 'How much does your company make in a year?', placeholder: 'e.g. 12,000,000', type: 'number' },
        { key: 'cogs', label: 'Cost of Goods Sold / Direct Costs (₦)', placeholder: 'e.g. 7,000,000', type: 'number' },
        { key: 'opex', label: 'Total Operating Expenses (₦)', placeholder: 'e.g. 2,000,000', type: 'number' },
        { key: 'assets', label: 'Total Assets (₦)', placeholder: 'e.g. 20,000,000', type: 'number' },
        { key: 'liabilities', label: 'Total Liabilities (₦)', placeholder: 'e.g. 8,000,000', type: 'number' },
        { key: 'yearEnd', label: 'Financial Year End Date', placeholder: 'e.g. 31 Dec 2024', type: 'text' },
        { key: 'auditor', label: 'Name of Accountant / Auditor (if any)', placeholder: 'e.g. ABC & Partners', type: 'text' },
    ] : [
        { key: 'monthlyRevenue', label: 'Average Monthly Revenue (₦)', placeholder: 'e.g. 1,000,000', type: 'number' },
        { key: 'monthlyExpenses', label: 'Average Monthly Expenses (₦)', placeholder: 'e.g. 600,000', type: 'number' },
        { key: 'loanRepayment', label: 'Proposed Monthly Loan Repayment (₦)', placeholder: 'Auto-filled', type: 'number' },
        { key: 'seasonality', label: 'Describe any seasonal patterns in revenue', placeholder: 'e.g. Higher sales in Dec/Jan due to festive period', type: 'text' },
        { key: 'projectionPeriod', label: 'Projection Period (months)', placeholder: 'e.g. 24', type: 'number' },
        { key: 'growthRate', label: 'Expected Monthly Revenue Growth (%)', placeholder: 'e.g. 3', type: 'number' },
    ];

    const generateFinancialDoc = () => {
        setWizardGenerating(true);
        setTimeout(() => {
            const a = wizardAnswers;
            let csvContent = '';

            if (wizardTarget === 'auditedFinancials') {
                const rev   = Number((a.revenue   || '0').replace(/,/g,''));
                const cogs  = Number((a.cogs      || '0').replace(/,/g,''));
                const opex  = Number((a.opex      || '0').replace(/,/g,''));
                const gross = rev - cogs;
                const net   = gross - opex;
                const assets = Number((a.assets       || '0').replace(/,/g,''));
                const liab   = Number((a.liabilities  || '0').replace(/,/g,''));
                const equity = assets - liab;

                csvContent = [
                    `AUDITED FINANCIAL STATEMENT — Generated by FairPrice Financing`,
                    `Year End:,${a.yearEnd || 'N/A'}`,
                    `Auditor:,${a.auditor || 'Self-Reported'}`,
                    ``,
                    `INCOME STATEMENT`,
                    `Revenue,₦${rev.toLocaleString()}`,
                    `Cost of Goods Sold,₦${cogs.toLocaleString()}`,
                    `Gross Profit,₦${gross.toLocaleString()}`,
                    `Operating Expenses,₦${opex.toLocaleString()}`,
                    `Net Profit,₦${net.toLocaleString()}`,
                    ``,
                    `BALANCE SHEET`,
                    `Total Assets,₦${assets.toLocaleString()}`,
                    `Total Liabilities,₦${liab.toLocaleString()}`,
                    `Shareholders Equity,₦${equity.toLocaleString()}`,
                ].join('\n');
            } else {
                const monthlyRev  = Number((a.monthlyRevenue || '0').replace(/,/g,''));
                const monthlyExp  = Number((a.monthlyExpenses|| '0').replace(/,/g,''));
                const repayment   = Number((a.loanRepayment  || String(Math.round(loanAmount * 0.036 / 12))).replace(/,/g,''));
                const growth      = Number(a.growthRate || '2') / 100;
                const months      = Math.min(Number(a.projectionPeriod || tenureMonths), 48);

                const rows = [`Month,Revenue (₦),Expenses (₦),Loan Repayment (₦),Net Cash Flow (₦)`];
                let cumRev = monthlyRev;
                for (let i = 1; i <= months; i++) {
                    const netFlow = cumRev - monthlyExp - repayment;
                    rows.push(`Month ${i},${Math.round(cumRev).toLocaleString()},${monthlyExp.toLocaleString()},${repayment.toLocaleString()},${Math.round(netFlow).toLocaleString()}`);
                    cumRev = cumRev * (1 + growth);
                }
                csvContent = [
                    `CASH FLOW PROJECTION — Generated by FairPrice Financing`,
                    `Seasonality Notes:,${a.seasonality || 'None specified'}`,
                    ``,
                    ...rows,
                ].join('\n');
            }

            // Create a File object from the CSV and store it in documents
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const filename = wizardTarget === 'auditedFinancials'
                ? 'Audited-Financials-Generated.csv'
                : 'Cash-Flow-Projection-Generated.csv';
            const file = new File([blob], filename, { type: 'text/csv' });
            setDocuments(prev => ({ ...prev, [wizardTarget]: file }));
            setWizardGenerating(false);
            setShowFinancialWizard(false);
        }, 1200);
    };

    const currentQ = WIZARD_QUESTIONS[wizardStep];
    const wizardTitle = wizardTarget === 'auditedFinancials' ? 'Generate Audited Financials' : 'Generate Cash Flow Projection';

    return (
        <>
        {/* Financial Document Wizard */}
        {showFinancialWizard && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-purple-500 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900">{wizardTitle}</h4>
                                <p className="text-[9px] text-gray-400">Step {wizardStep + 1} of {WIZARD_QUESTIONS.length}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowFinancialWizard(false)} className="p-1 rounded-lg hover:bg-gray-100">
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-5">
                        {/* Progress bar */}
                        <div className="h-1 bg-gray-100 rounded-full mb-5 overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${((wizardStep) / WIZARD_QUESTIONS.length) * 100}%` }} />
                        </div>

                        {wizardGenerating ? (
                            <div className="py-8 text-center space-y-3">
                                <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
                                    <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">Generating your document…</p>
                                <p className="text-xs text-gray-400">This will be added to your application automatically.</p>
                            </div>
                        ) : (
                            <>
                                <label className="block text-xs font-black text-gray-700 mb-1.5">{currentQ?.label}</label>
                                <input
                                    key={currentQ?.key}
                                    type={currentQ?.type === 'number' ? 'text' : 'text'}
                                    inputMode={currentQ?.type === 'number' ? 'numeric' : 'text'}
                                    placeholder={currentQ?.placeholder}
                                    defaultValue={wizardAnswers[currentQ?.key || ''] || ''}
                                    onChange={e => setWizardAnswers(prev => ({ ...prev, [currentQ!.key]: e.target.value }))}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none text-sm font-medium"
                                    autoFocus
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                    {wizardTarget === 'auditedFinancials' && currentQ?.key === 'revenue'
                                        ? 'Hint: Add up your total account balance from your annual bank statement'
                                        : wizardTarget === 'cashFlowProjection' && currentQ?.key === 'loanRepayment'
                                            ? `Suggested: ₦${(monthlyPayment && monthlyPayment > 0 ? Math.round(monthlyPayment) : Math.round(loanAmount * 0.036 / 12)).toLocaleString()} / month`
                                            : 'Enter approximate figures — they help generate realistic projections.'
                                    }
                                </p>

                                <div className="flex gap-2 mt-4">
                                    {wizardStep > 0 && (
                                        <button
                                            onClick={() => setWizardStep(s => s - 1)}
                                            className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50"
                                        >
                                            Back
                                        </button>
                                    )}
                                    <Button
                                        onClick={() => {
                                            if (wizardStep < WIZARD_QUESTIONS.length - 1) {
                                                setWizardStep(s => s + 1);
                                            } else {
                                                generateFinancialDoc();
                                            }
                                        }}
                                        className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        {wizardStep < WIZARD_QUESTIONS.length - 1 ? (
                                            <>Next <ChevronRight className="h-3.5 w-3.5" /></>
                                        ) : (
                                            <><Sparkles className="h-3.5 w-3.5" /> Generate Document</>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {showBoardResolutionGenerator && (
            <BoardResolutionGenerator
                productName={productName}
                loanAmount={loanAmount}
                tenureMonths={tenureMonths}
                initialData={boardResolution ?? undefined}
                onSave={(res) => { setBoardResolution(res); setShowBoardResolutionGenerator(false); }}
                onClose={() => setShowBoardResolutionGenerator(false)}
            />
        )}
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Upload Documents</h2>
                <p className="text-gray-500 text-sm mt-1">
                    {uploadedCount} of {requiredDocs.length} documents uploaded
                </p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(uploadedCount / requiredDocs.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pb-2">
                {/* AltBank partnership notice + form download */}
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60">
                    <div className="flex items-start gap-2 mb-2">
                        <span className="text-base shrink-0 mt-0.5">🏦</span>
                        <div>
                            <p className="text-xs font-black text-blue-800">Powered by AltBank</p>
                            <p className="text-[10px] text-blue-600 leading-relaxed mt-0.5">
                                AltBank is FairPrice's trusted financing partner. Download your personalised form below, fill in your details, and upload it with your documents.
                            </p>
                        </div>
                    </div>
                    <a
                        href={altbankForm.path}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="h-3 w-3" />
                        Download {altbankForm.label}
                    </a>
                </div>

                {/* Required document uploads */}
                {requiredDocs.map((doc) => {
                    const val = documents[doc.key];
                    const uploaded = fileCount(val) > 0;
                    const isMulti = !!doc.multiple;
                    const isAltbank = doc.key === 'altbankForm';

                    return (
                        <div
                            key={doc.key}
                            className={`p-3 rounded-xl border transition-all ${uploaded ? 'border-emerald-200 bg-emerald-50/50' : showValidation ? 'border-red-300 bg-red-50' : isAltbank ? 'border-blue-100 bg-blue-50/30 hover:border-blue-200' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${uploaded ? 'bg-emerald-500' : isAltbank ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    {uploaded
                                        ? <CheckCircle2 className="h-4 w-4 text-white" />
                                        : isMulti
                                            ? <Files className="h-4 w-4 text-gray-400" />
                                            : isAltbank
                                                ? <UploadCloud className="h-4 w-4 text-blue-400" />
                                                : <UploadCloud className="h-4 w-4 text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold ${uploaded ? 'text-emerald-700' : isAltbank ? 'text-blue-700' : 'text-gray-800'}`}>
                                        {doc.label}
                                    </p>
                                    {uploaded
                                        ? <p className="text-[10px] text-emerald-600 mt-0.5 truncate">{fileName(val)}</p>
                                        : <p className={`text-[10px] mt-0.5 ${isAltbank ? 'text-blue-400' : 'text-gray-400'}`}>{doc.hint}</p>
                                    }
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                    <label className="cursor-pointer">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${uploaded ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-100' : isAltbank ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                            {uploaded ? 'Change' : 'Upload'}
                                        </span>
                                        <input
                                            type="file"
                                            accept={doc.accept}
                                            multiple={isMulti}
                                            className="sr-only"
                                            onChange={(e) => handleFile(doc.key, doc.multiple, e.target.files)}
                                        />
                                    </label>
                                    {/* AI Generate button for financial docs */}
                                    {(doc.key === 'auditedFinancials' || doc.key === 'cashFlowProjection') && !uploaded && (
                                        <button
                                            type="button"
                                            onClick={() => openWizard(doc.key as 'auditedFinancials' | 'cashFlowProjection')}
                                            className="text-[9px] font-black px-2 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 flex items-center gap-0.5 transition-all"
                                        >
                                            <Sparkles className="h-2.5 w-2.5" /> Generate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Board Resolution — business owners only */}
                {boardResolutionRequired && (
                    <div className={`rounded-xl border p-3 ${boardResolution ? 'border-emerald-200 bg-emerald-50/40' : showValidation ? 'border-red-300 bg-red-50' : 'border-amber-100 bg-amber-50/30'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${boardResolution ? 'bg-emerald-500' : 'bg-amber-100'}`}>
                                {boardResolution
                                    ? <CheckCircle2 className="h-4 w-4 text-white" />
                                    : <FileSignature className="h-4 w-4 text-amber-500" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold ${boardResolution ? 'text-emerald-700' : 'text-amber-800'}`}>
                                    Board Resolution
                                </p>
                                {boardResolution ? (
                                    <p className="text-[10px] text-emerald-600 mt-0.5">
                                        {boardResolution.companyName} · {boardResolution.directors.length} director{boardResolution.directors.length !== 1 ? 's' : ''} signed
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-amber-600 mt-0.5">Required for business applications — auto-generated</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowBoardResolutionGenerator(true)}
                                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${boardResolution ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                            >
                                {boardResolution ? 'Edit' : 'Generate'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Applicant signature */}
                <div className={`rounded-xl border p-3 ${showValidation && !signature ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'}`}>
                    <p className="text-xs font-black text-gray-800 mb-0.5">Applicant Signature</p>
                    <p className="text-[10px] text-gray-400 mb-1">Sign below — this will be attached to your application</p>
                    <SignatureCanvas
                        onSave={(dataUrl) => setSignature(dataUrl)}
                        onClear={() => setSignature(null)}
                        existingSignature={signature}
                    />
                </div>

                {/* Vendor invoice notice */}
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] text-blue-600 font-medium">
                        📄 Vendor invoice is auto-generated by FairPrice upon order completion and will be sent to your email.
                    </p>
                </div>
            </div>

            {/* Save progress */}
            <div className="mt-3 flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || uploadedCount === 0}
                    className="flex items-center gap-1.5 text-xs font-bold"
                >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Progress
                </Button>
                {savedAt && (
                    <span className="text-[10px] text-gray-400">
                        Saved at {savedAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            <div className="mt-3">
                <Button
                    onClick={() => {
                        if (!allUploaded) {
                            setShowValidation(true);
                            return;
                        }
                        setShowValidation(false);
                        onNext(documents, signature, boardResolution ?? undefined);
                    }}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100"
                >
                    Review Application
                </Button>
                {showValidation && !allUploaded && (
                    <p className="text-center text-[10px] text-red-500 mt-1.5 font-medium">
                        {uploadedCount < requiredDocs.length && `Please upload all ${requiredDocs.length} required documents`}
                        {uploadedCount >= requiredDocs.length && !boardResolutionDone && 'Please generate your board resolution to continue'}
                        {uploadedCount >= requiredDocs.length && boardResolutionDone && !signature && 'Please add your signature to continue'}
                    </p>
                )}
            </div>
        </div>
        </>
    );
}
