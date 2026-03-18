"use client";

import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  "#007BFF", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
];

function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function applyPrimaryColor(hex) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

  const { h, s, l } = hexToHSL(hex);
  const root = document.documentElement;

  // Apply to shadcn CSS variables using oklch approximation
  // We use HSL values mapped to the --primary variable
  root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.style.setProperty(
    "--primary-foreground",
    l > 50 ? "0 0% 10%" : "0 0% 98%"
  );

  // Sidebar primary
  root.style.setProperty("--sidebar-primary", `${h} ${s}% ${l}%`);
  root.style.setProperty(
    "--sidebar-primary-foreground",
    l > 50 ? "0 0% 10%" : "0 0% 98%"
  );

  // Ring
  root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
}

export function ColorPicker() {
  const [color, setColor] = useState("#007BFF");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pg-primary-color");
    if (saved) {
      setColor(saved);
      applyPrimaryColor(saved);
    }
  }, []);

  function handleColorChange(hex) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    setColor(hex);
    applyPrimaryColor(hex);
    localStorage.setItem("pg-primary-color", hex);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change primary color">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Primary Color</Label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: preset,
                  borderColor: color === preset ? "white" : "transparent",
                  boxShadow:
                    color === preset ? `0 0 0 2px ${preset}` : "none",
                }}
                onClick={() => handleColorChange(preset)}
                aria-label={`Select color ${preset}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md border"
              style={{ backgroundColor: color }}
            />
            <Input
              value={color}
              onChange={(e) => {
                const val = e.target.value;
                setColor(val);
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  handleColorChange(val);
                }
              }}
              placeholder="#007BFF"
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
