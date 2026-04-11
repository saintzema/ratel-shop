"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryCard, CATEGORY_CARDS_ROW_1 } from "@/app/page";
import { Save, Image as ImageIcon, Link as LinkIcon, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function HomepageGridsAdmin() {
  const [grids, setGrids] = useState<CategoryCard[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ratel_homepage_grids");
    if (saved) {
      try {
        setGrids(JSON.parse(saved));
      } catch (e) {
        setGrids(CATEGORY_CARDS_ROW_1);
      }
    } else {
      setGrids(CATEGORY_CARDS_ROW_1);
    }
  }, []);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleSave = () => {
    localStorage.setItem("ratel_homepage_grids", JSON.stringify(grids));
    window.dispatchEvent(new Event("storage"));
    flash("Homepage grids successfully saved!");
  };

  const updateGridField = (gridIndex: number, field: keyof CategoryCard, value: string) => {
    const next = [...grids];
    next[gridIndex] = { ...next[gridIndex], [field]: value };
    setGrids(next);
  };

  const updateSubField = (gridIndex: number, subIndex: number, field: "label" | "image" | "href", value: string) => {
    const next = [...grids];
    const subs = [...next[gridIndex].subs];
    subs[subIndex] = { ...subs[subIndex], [field]: value };
    next[gridIndex] = { ...next[gridIndex], subs };
    setGrids(next);
  };

  if (!grids.length) return <div>Loading...</div>;

  return (
    <div className="space-y-8 max-w-5xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
            <ChevronLeft className="h-3 w-3" /> Back to Settings
          </Link>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Homepage Grids</h2>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Manage the 4-square category images on the homepage</p>
        </div>
        <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-5 h-10">
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {grids.map((grid, gridIndex) => (
          <div key={gridIndex} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
            <div className="mb-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Grid Title</label>
                <Input value={grid.title} onChange={e => updateGridField(gridIndex, "title", e.target.value)} className="font-bold bg-gray-50 border-none rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Link Text</label>
                  <Input value={grid.linkText} onChange={e => updateGridField(gridIndex, "linkText", e.target.value)} className="bg-gray-50 border-none rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Link URL</label>
                  <Input value={grid.link} onChange={e => updateGridField(gridIndex, "link", e.target.value)} className="bg-gray-50 border-none rounded-xl text-sm font-mono text-xs" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {grid.subs.map((sub, subIndex) => (
                <div key={subIndex} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-3 group">
                  <div className="h-24 w-full relative rounded-xl overflow-hidden bg-gray-100 group-hover:shadow-md transition-shadow">
                    <img src={sub.image} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Input value={sub.label} onChange={e => updateSubField(gridIndex, subIndex, "label", e.target.value)} className="h-8 text-xs font-bold bg-white border-gray-200" placeholder="Label" />
                    <Input value={sub.href} onChange={e => updateSubField(gridIndex, subIndex, "href", e.target.value)} className="h-8 text-[10px] font-mono bg-white border-gray-200" placeholder="/search?category=..." />
                    <Input value={sub.image} onChange={e => updateSubField(gridIndex, subIndex, "image", e.target.value)} className="h-8 text-[10px] font-mono bg-white border-gray-200 text-emerald-700" placeholder="Image URL" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {statusMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
