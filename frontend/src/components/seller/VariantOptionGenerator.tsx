"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface GeneratedVariant {
    name: string; price: string; image_url: string; original_price: string; stock: string;
    options: Record<string, string>;
}

/**
 * Builds a variant list from up to two attributes (e.g. Capacity × Style) so the product page can
 * show one chip group per attribute — like the Pinduoduo/Taobao picker — instead of one long list.
 * Each generated row is still an ordinary variant (own price, image, stock); `options` just records
 * which attribute values it represents.
 */
export function VariantOptionGenerator({ onGenerate }: { onGenerate: (rows: GeneratedVariant[]) => void }) {
    const [name1, setName1] = useState("Capacity");
    const [vals1, setVals1] = useState("");
    const [name2, setName2] = useState("Style");
    const [vals2, setVals2] = useState("");

    const split = (s: string) => Array.from(new Set(s.split(",").map(v => v.trim()).filter(Boolean)));

    const generate = () => {
        const a = split(vals1), b = split(vals2);
        if (a.length === 0) return;
        const n1 = name1.trim() || "Option", n2 = name2.trim() || "Style";
        const rows: GeneratedVariant[] = [];
        for (const x of a) {
            if (b.length === 0) rows.push({ name: x, price: "", image_url: "", original_price: "", stock: "", options: { [n1]: x } });
            else for (const y of b) rows.push({ name: `${x} / ${y}`, price: "", image_url: "", original_price: "", stock: "", options: { [n1]: x, [n2]: y } });
        }
        onGenerate(rows);
    };

    return (
        <div className="mb-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Wand2 className="h-4 w-4 text-indigo-600" /> Build from attributes</p>
            <p className="text-xs text-gray-500">Type up to two attributes and their values, comma separated. We create one option per combination — then set each one's price, photo and stock below.</p>
            <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Input value={name1} onChange={e => setName1(e.target.value)} placeholder="Attribute 1 (e.g. Capacity)" className="h-9 text-sm bg-white" />
                    <Input value={vals1} onChange={e => setVals1(e.target.value)} placeholder="40Ah, 50Ah, 80Ah" className="h-9 text-sm bg-white" />
                </div>
                <div className="space-y-1.5">
                    <Input value={name2} onChange={e => setName2(e.target.value)} placeholder="Attribute 2 (optional, e.g. Style)" className="h-9 text-sm bg-white" />
                    <Input value={vals2} onChange={e => setVals2(e.target.value)} placeholder="Vertical, Horizontal" className="h-9 text-sm bg-white" />
                </div>
            </div>
            <Button type="button" variant="outline" onClick={generate} disabled={!vals1.trim()} className="h-9 text-sm">Generate options</Button>
        </div>
    );
}
