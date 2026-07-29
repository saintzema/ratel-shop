import jsPDF from "jspdf";

export interface QuotePdfData {
    title: string;
    clientName: string;
    items: { description: string; qty: number; unitPrice: number }[];
    subtotal: number;
    total: number;
    depositRequired: boolean;
    depositAmount: number | null;
    notes: string | null;
    createdAt: string | Date;
    sellerName: string;
    sellerLogoUrl?: string | null;
    sellerContact?: string | null;
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// Best-effort image fetch → data URL for jsPDF's addImage (which needs a
// data URL, not a bare remote URL). Never throws — a logo that fails to load
// (CORS, network, missing file) just falls back to a plain text header
// instead of blocking the whole PDF.
async function toDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function generateQuotePdf(data: QuotePdfData): Promise<void> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    let y = 55;

    // Logo — seller's own if they have one, otherwise the FairPrice logo, so
    // every quote looks professionally branded either way.
    const logoUrl = data.sellerLogoUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/logo.png`;
    const logoDataUrl = await toDataUrl(logoUrl);
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", margin, y - 20, 48, 48);
        } catch { /* corrupt/unsupported image format — skip, text header still renders */ }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(data.sellerName, margin + (logoDataUrl ? 60 : 0), y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (data.sellerContact) doc.text(data.sellerContact, margin + (logoDataUrl ? 60 : 0), y + 14);
    doc.setTextColor(0);

    y += 55;
    doc.setDrawColor(230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(data.title, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Quote for: ${data.clientName}`, margin, y + 18);
    doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`, margin, y + 32);
    doc.setTextColor(0);
    y += 60;

    // Line items table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Description", margin, y);
    doc.text("Qty", pageWidth - margin - 160, y);
    doc.text("Unit Price", pageWidth - margin - 115, y);
    doc.text("Total", pageWidth - margin - 40, y);
    y += 8;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    for (const item of data.items) {
        if (y > 700) { doc.addPage(); y = 55; }
        const lines = doc.splitTextToSize(item.description, pageWidth - margin * 2 - 180);
        doc.text(lines, margin, y);
        doc.text(String(item.qty), pageWidth - margin - 160, y);
        doc.text(fmt(item.unitPrice), pageWidth - margin - 115, y);
        doc.text(fmt(item.qty * item.unitPrice), pageWidth - margin - 40, y);
        y += Math.max(16, lines.length * 12);
    }

    y += 10;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total", pageWidth - margin - 115, y);
    doc.text(fmt(data.total), pageWidth - margin - 40, y);

    if (data.depositRequired && data.depositAmount) {
        y += 18;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Deposit required to begin: ${fmt(data.depositAmount)}`, pageWidth - margin - 220, y);
        y += 14;
        doc.text(`Balance on completion: ${fmt(data.total - data.depositAmount)}`, pageWidth - margin - 220, y);
    }

    if (data.notes) {
        y += 30;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120);
        const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
        doc.text(noteLines, margin, y);
    }

    doc.save(`${data.title.replace(/[^a-z0-9]+/gi, "-")}-quote.pdf`);
}
