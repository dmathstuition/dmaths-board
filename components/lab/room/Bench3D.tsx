"use client";
// The free experiment bench in 3D (three.js): a lit laboratory worktop with the
// apparatus the learner picked, as 3D models. Drag a piece onto another to use
// them together (or tap one, then the other); drag the empty space to walk
// round the bench, pinch or scroll to zoom. Liquids, precipitates, bubbles,
// steam, flames, glowing bulbs, meters and wires follow the bench state.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Item } from "@/lib/lab/room/inventory";
import { colourOf, partOf, type BenchState, type Slot } from "@/lib/lab/room/bench";
import { shapeOf } from "@/components/lab/room/Anim";

type Pos = Record<string, { x: number; y: number }>;
export const hasWebGL = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
const isVessel = (it: Item) => it.spec.e === "vessel" || /tube|flask|beaker|dish|jar|bottle|calorimeter|trough|cylinder/i.test(it.name);
const TOP = 0.9; // the worktop's surface
// Bench layout (x %, y %) ↔ the worktop (x, z).
const toWorld = (p: { x: number; y: number }) => new THREE.Vector3((p.x / 90) * 8.4 - 4.2, TOP, -1.9 + (Math.min(62, p.y) / 62) * 3.4);
const toLayout = (v: THREE.Vector3) => ({ x: Math.max(0, Math.min(90, ((v.x + 4.2) / 8.4) * 90)), y: Math.max(0, Math.min(62, ((v.z + 1.9) / 3.4) * 62)) });

function labelTexture(text: string, sub = "") {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const g = c.getContext("2d")!;
  g.font = "bold 44px system-ui, sans-serif"; const tw = Math.min(492, g.measureText(text).width + 40);
  g.fillStyle = "rgba(11,18,32,0.78)"; g.beginPath(); g.roundRect((512 - tw) / 2, 10, tw, sub ? 108 : 64, 18); g.fill();
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 42, 480);
  if (sub) { g.font = "bold 38px ui-monospace, monospace"; g.fillStyle = "#34D399"; g.fillText(sub, 256, 92, 480); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function iconTexture(icon: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!; g.font = "180px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(icon, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dialTexture(value: number, max: number, unit: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 192;
  const g = c.getContext("2d")!; g.fillStyle = "#F8FAF5"; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = "#1F2937"; g.lineWidth = 3;
  for (let k = 0; k <= 10; k++) { const a = ((k * 10 - 50) * Math.PI) / 180; g.beginPath(); g.moveTo(128 + 92 * Math.sin(a), 160 - 92 * Math.cos(a)); g.lineTo(128 + (k % 5 ? 80 : 72) * Math.sin(a), 160 - (k % 5 ? 80 : 72) * Math.cos(a)); g.stroke(); }
  const a = ((Math.max(0, Math.min(1, value / max)) * 100 - 50) * Math.PI) / 180;
  g.strokeStyle = "#DC2626"; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 160); g.lineTo(128 + 96 * Math.sin(a), 160 - 96 * Math.cos(a)); g.stroke();
  g.fillStyle = "#1F2937"; g.font = "bold 34px system-ui"; g.textAlign = "center"; g.fillText(unit, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// A soft round puff (steam), made once.
let PUFF: THREE.Texture | null = null;
function puff() {
  if (PUFF) return PUFF;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d")!, r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  PUFF = new THREE.CanvasTexture(c); return PUFF;
}
type Model = { group: THREE.Group; height: number; update: (s: Slot, t: number) => void; animate: (t: number) => void; dispose: () => void };
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
const std = (color: number | string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...o });

function build(it: Item): Model {
  const group = new THREE.Group(); group.userData.id = it.id;
  const disposables: { dispose: () => void }[] = [];
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.userData.id = it.id; if (m.geometry) disposables.push(m.geometry); const mat = m.material as THREE.Material | THREE.Material[]; (Array.isArray(mat) ? mat : [mat]).forEach((q) => disposables.push(q)); } }); return o; };
  let height = 0.6, update: Model["update"] = () => {}, animate: Model["animate"] = () => {};
  const part = partOf(it);

  if (isVessel(it) && it.spec.e !== "scale") {
    const shape = shapeOf(it.name);
    const dims = shape === "tube" ? { r: 0.11, h: 0.95 } : shape === "flask" ? { r: 0.34, h: 0.85 } : shape === "cylinder" ? { r: 0.15, h: 1.3 } : shape === "dish" ? { r: 0.42, h: 0.14 } : { r: 0.32, h: 0.72 };
    height = dims.h;
    let glass: THREE.Mesh;
    if (shape === "flask") {
      const prof = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.34, 0.02), new THREE.Vector2(0.36, 0.08), new THREE.Vector2(0.1, 0.6), new THREE.Vector2(0.1, 0.85)];
      glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), glassMat());
    } else if (shape === "tube") {
      const prof = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.07, 0.015), new THREE.Vector2(0.105, 0.08), new THREE.Vector2(0.11, 0.12), new THREE.Vector2(0.11, dims.h), new THREE.Vector2(0.125, dims.h)];
      glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), glassMat());
    } else glass = new THREE.Mesh(new THREE.CylinderGeometry(dims.r, dims.r * (shape === "dish" ? 0.9 : 0.97), dims.h, 40, 1, true), glassMat()), glass.position.y = dims.h / 2;
    if (shape !== "flask" && shape !== "tube") { const base = new THREE.Mesh(new THREE.CircleGeometry(dims.r * 0.97, 40), glassMat()); base.rotation.x = -Math.PI / 2; base.position.y = 0.005; add(base); }
    add(glass);
    if (shape === "tube") { const block = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), std(0x8b5e34, { roughness: 0.8 })); block.position.y = 0.06; add(block); }
    // Liquid, precipitate, bubbles and steam.
    const liqR = shape === "flask" ? 0.3 : dims.r * 0.92;
    const liqMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.72, roughness: 0.1, transmission: 0.2 });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(liqR, liqR * (shape === "flask" ? 1.12 : 1), 1, 32), liqMat); liquid.visible = false; add(liquid);
    const pptMat = std(0xffffff, { roughness: 0.9 }); const ppt = new THREE.Mesh(new THREE.CylinderGeometry(liqR * 0.98, liqR * 0.98, 1, 28), pptMat); ppt.visible = false; add(ppt);
    const bubbles = Array.from({ length: 12 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random() * 0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); b.visible = false; b.userData.seed = Math.random(); add(b); return b; });
    const steam = Array.from({ length: 6 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); sp.scale.setScalar(0.2); sp.visible = false; sp.userData.seed = Math.random(); group.add(sp); disposables.push(sp.material); return sp; });
    let level = 0, fizz = false, boil = false, shown = 0;
    update = (s) => {
      const l = s.liquid;
      level = l ? Math.min(0.85, 0.25 + l.vol / 60) * (shape === "flask" ? 0.42 : dims.h * 0.92) : 0;
      liquid.visible = !!l; if (l) liqMat.color.set(colourOf(l));
      ppt.visible = !!l?.ppt; if (l?.ppt) { pptMat.color.set(l.ppt.colour); }
      fizz = !!l?.gas; boil = !!s.boiling;
    };
    animate = (t) => {
      shown += (level - shown) * 0.08; // the level rises as you pour
      const bottom = shape === "tube" ? 0.06 : 0.01;
      liquid.scale.y = Math.max(0.001, shown); liquid.position.y = bottom + shown / 2;
      if (ppt.visible) { const h = Math.min(shown, Math.max(0.03, shown * 0.3)); ppt.scale.y = h; ppt.position.y = bottom + h / 2; }
      bubbles.forEach((b, k) => {
        b.visible = (fizz || boil) && shown > 0.03;
        if (!b.visible) return;
        const ph = ((t * (boil ? 0.9 : 0.5) + b.userData.seed) % 1), a = b.userData.seed * Math.PI * 2 + k;
        b.position.set(Math.cos(a) * liqR * 0.6 * b.userData.seed, bottom + ph * shown, Math.sin(a) * liqR * 0.6 * b.userData.seed);
      });
      steam.forEach((sp) => { sp.visible = boil; if (!boil) return; const ph = (t * 0.4 + sp.userData.seed) % 1; sp.position.set((sp.userData.seed - 0.5) * 0.2 + ph * 0.1, dims.h + ph * 0.7, 0); sp.scale.setScalar(0.12 + ph * 0.3); (sp.material as THREE.SpriteMaterial).opacity = 0.35 * (1 - ph); });
    };
  } else if (it.spec.e === "heater" && it.spec.power > 0) {
    const plate = /plate|mantle|bath|furnace|oven|ceramic/i.test(it.name);
    if (plate) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), std(0x334155)); box.position.y = 0.11; add(box);
      const topMat = std(0x64748b, { emissive: 0x000000 }); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 32), topMat); top.position.y = 0.235; add(top);
      height = 0.25;
      update = (s) => { topMat.emissive.set(s.on ? 0xf97316 : 0x000000); topMat.emissiveIntensity = s.on ? 0.9 : 0; };
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 32), std(0x475569)); base.position.y = 0.04; add(base);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 20), std(0xd4a017, { metalness: 0.8, roughness: 0.3 })); tube.position.y = 0.35; add(tube);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 20), std(0xb45309, { metalness: 0.7 })); collar.position.y = 0.16; add(collar);
      // A tripod and gauze over it, ready for a beaker.
      [0, 1, 2].forEach((k) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), std(0x1f2937, { metalness: 0.6 })); const a = (k * Math.PI * 2) / 3; leg.position.set(Math.cos(a) * 0.36, 0.5, Math.sin(a) * 0.36); leg.rotation.z = Math.cos(a) * 0.12; leg.rotation.x = -Math.sin(a) * 0.12; add(leg); });
      const gauze = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.01, 0.62), std(0x9ca3af, { metalness: 0.5, roughness: 0.8 })); gauze.position.y = 1.0; add(gauze);
      height = 1.01;
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      const inner = new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.36, 20, 1, true), flameMat); flame.position.y = 0.8; group.add(flame); disposables.push(flame.geometry, flameMat);
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 16), inner); core.position.y = 0.71; group.add(core); disposables.push(core.geometry, inner);
      const light = new THREE.PointLight(0x60a5fa, 0, 2.5); light.position.y = 0.9; group.add(light);
      let on = false;
      update = (s) => { on = !!s.on; flame.visible = core.visible = on; light.intensity = on ? 1.6 : 0; };
      animate = (t) => { if (!on) return; const f = 1 + Math.sin(t * 31) * 0.08 + Math.sin(t * 17) * 0.06; flame.scale.set(1 / f, f, 1 / f); core.scale.set(1, 0.9 + Math.sin(t * 23) * 0.08, 1); light.intensity = 1.4 + Math.sin(t * 27) * 0.25; };
    }
  } else if (it.spec.e === "scale" && it.spec.unit === "°C") {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 12), glassMat()); glass.position.y = 0.62; add(glass);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), std(0xdc2626, { emissive: 0x7f1d1d })); bulb.position.y = 0.06; add(bulb);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), std(0xdc2626, { emissive: 0x991b1b })); add(thread);
    height = 1.17; let T = 25, shown = 25;
    update = (s) => { T = parseFloat(s.reading ?? "25") || 25; };
    animate = () => { shown += (T - shown) * 0.06; const h = 0.08 + (Math.max(-10, Math.min(110, shown)) + 10) / 120 * 0.95; thread.scale.y = h; thread.position.y = 0.08 + h / 2; };
  } else if (part === "lamp" || part === "led") {
    const holder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), std(0x475569)); holder.position.y = 0.06; add(holder);
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), std(0x9ca3af, { metalness: 0.8 })); capM.position.y = 0.17; add(capM);
    const glowMat = new THREE.MeshStandardMaterial({ color: part === "led" ? 0x7f1d1d : 0xfefce8, emissive: part === "led" ? 0xef4444 : 0xfde047, emissiveIntensity: 0, transparent: true, opacity: part === "led" ? 1 : 0.7, roughness: 0.1 });
    const bulb = new THREE.Mesh(part === "led" ? new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16) : new THREE.SphereGeometry(0.13, 24, 18), glowMat); bulb.position.y = part === "led" ? 0.29 : 0.33; add(bulb);
    const light = new THREE.PointLight(part === "led" ? 0xef4444 : 0xfde68a, 0, 3); light.position.y = 0.35; group.add(light);
    height = 0.46;
    update = (s) => { const g = s.glow ?? 0; glowMat.emissiveIntensity = g * 2.2; light.intensity = g * 2.5; };
  } else if (part === "ammeter" || part === "voltmeter") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.22), std(0x1f2937)); box.position.y = 0.21; box.rotation.x = -0.15; add(box);
    const faceMat = new THREE.MeshBasicMaterial({ map: dialTexture(0, 1, part === "ammeter" ? "A" : "V") }); const face = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.33), faceMat); face.position.set(0, 0.24, 0.113); face.rotation.x = -0.15; add(face);
    height = 0.45; let last = "";
    update = (s) => { const r = s.reading ?? ""; if (r === last) return; last = r; faceMat.map?.dispose(); faceMat.map = dialTexture(parseFloat(r) || 0, part === "ammeter" ? 1 : 12, part === "ammeter" ? "A" : "V"); faceMat.needsUpdate = true; };
  } else if (part === "cell" || part === "supply") {
    if (part === "supply") { const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.45), std(0x334155)); box.position.y = 0.18; add(box); [-0.15, 0.15].forEach((x, k) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), std(k ? 0xdc2626 : 0x111827)); t.position.set(x, 0.24, 0.24); t.rotation.x = Math.PI / 2; add(t); }); height = 0.36; }
    else { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 24), std(0x16a34a)); body.position.y = 0.21; add(body); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), std(0x9ca3af, { metalness: 0.8 })); cap.position.y = 0.44; add(cap); height = 0.46; }
  } else if (part === "switch") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.22), std(0x8b5e34)); base.position.y = 0.03; add(base);
    const lever = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.04), std(0xd1d5db, { metalness: 0.8 })); bar.position.x = 0.15; lever.add(bar); lever.position.set(-0.14, 0.08, 0); add(lever);
    height = 0.2; let closed = false;
    update = (s) => { closed = !!s.on; };
    animate = () => { const want = closed ? 0 : 0.6; lever.rotation.z += (want - lever.rotation.z) * 0.15; };
  } else if (part === "motor") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 24), std(0x475569)); body.rotation.z = Math.PI / 2; body.position.y = 0.16; add(body);
    const fan = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.05), std(0xfcd34d)); fan.position.set(0.2, 0.16, 0); add(fan);
    height = 0.34; let spin = false;
    update = (s) => { spin = !!s.spin; }; animate = () => { if (spin) fan.rotation.x += 0.4; };
  } else if (it.spec.e === "reagent" || it.spec.e === "indicator") {
    const brown = it.spec.e === "reagent" && /nitrate|permanganate|iodine|bromine|peroxide|silver/i.test(it.name);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.4, 24), new THREE.MeshPhysicalMaterial({ color: brown ? 0x78350f : 0xe0f2fe, transparent: true, opacity: brown ? 0.75 : 0.35, roughness: 0.1, clearcoat: 1 })); bottle.position.y = 0.2; add(bottle);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 16), bottle.material as THREE.Material); neck.position.y = 0.45; group.add(neck); neck.castShadow = true; neck.userData.id = it.id;
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 16), std(it.spec.e === "indicator" ? 0x7c3aed : 0x111827)); capM.position.y = 0.53; add(capM);
    const fluid = it.spec.e === "reagent" ? ({ CuSO4: 0x60a5fa, FeSO4: 0xbef264, FeCl3: 0xd97706, KMnO4: 0x7e22ce, K2Cr2O7: 0xf97316, "I2/KI": 0x92400e, "Br2(aq)": 0xea580c } as Record<string, number>)[it.spec.formula] : 0xa78bfa;
    if (it.spec.e === "reagent" && it.spec.kind === "gas") { bottle.scale.set(1.3, 1.6, 1.3); bottle.position.y = 0.32; neck.position.y = 0.68; capM.position.y = 0.74; }
    if (fluid && !brown) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.25, 20), std(fluid, { transparent: true, opacity: 0.8 })); f.position.y = 0.13; add(f); }
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff })); tag.position.set(0, 0.22, 0.142); add(tag);
    height = it.spec.e === "reagent" && it.spec.kind === "gas" ? 0.78 : 0.56;
  } else if (it.spec.e === "microscope") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.5), std(0x334155)); base.position.y = 0.03; add(base);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.12), std(0x475569)); arm.position.set(0, 0.4, -0.18); add(arm);
    const stage = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.3), std(0x1f2937)); stage.position.y = 0.36; add(stage);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 20), std(0xe5e7eb, { metalness: 0.4 })); tube.position.set(0, 0.68, -0.02); tube.rotation.x = 0.25; add(tube);
    height = 0.95;
  } else {
    // Everything else: a standee showing the piece, on a small base.
    const tex = iconTexture(it.icon);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    card.position.y = 0.32; add(card); disposables.push(tex);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 24), std(0x475569)); base.position.y = 0.02; add(base);
    height = 0.6;
    animate = (t) => { card.rotation.y = Math.sin(t * 0.8 + it.id.length) * 0.35; };
  }
  // Glassware a little larger than life, so colours and precipitates can be seen.
  if (isVessel(it) && it.spec.e !== "scale") { group.scale.setScalar(1.35); height *= 1.35; }
  return { group, height, update, animate, dispose: () => disposables.forEach((d) => d.dispose()) };
}

export default function Bench3D({ items, pos, bench, sel, onTap, onDrop, onMove }: {
  items: Item[]; pos: Pos; bench: BenchState; sel: string | null;
  onTap: (id: string | null) => void; onDrop: (a: string, b: string) => void; onMove: (id: string, p: { x: number; y: number }) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ sync: (items: Item[], pos: Pos, bench: BenchState, sel: string | null) => void } | null>(null);
  const cb = useRef({ onTap, onDrop, onMove }); cb.current = { onTap, onDrop, onMove };

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true"); renderer.domElement.style.touchAction = "none";
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111827); scene.fog = new THREE.Fog(0x111827, 14, 26);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60); camera.position.set(0, 3.9, 6.3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, TOP + 0.3, 0); controls.enablePan = false; controls.enableDamping = true; controls.minDistance = 3.2; controls.maxDistance = 12; controls.maxPolarAngle = Math.PI * 0.47; controls.minAzimuthAngle = -1.1; controls.maxAzimuthAngle = 1.1;

    // The room: floor, wall, window light, lamps; the bench and a shelf.
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.8));
    const sun = new THREE.DirectionalLight(0xfff7e0, 1.8); sun.position.set(-4, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 25 }); scene.add(sun);
    [-3.5, 3.5].forEach((x) => { const l = new THREE.PointLight(0xfef3c7, 0.9, 9); l.position.set(x, 4.2, -0.5); scene.add(l); const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, emissive: 0xfef9c3, emissiveIntensity: 0.6 })); lamp.position.set(x, 4.4, -0.5); scene.add(lamp); });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), std(0x1e293b, { roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), std(0x273449, { roughness: 1 })); wall.position.set(0, 6, -3.2); wall.receiveShadow = true; scene.add(wall);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.7), new THREE.MeshBasicMaterial({ color: 0x7dd3fc })); win.position.set(0, 3.4, -3.18); scene.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.04), std(0x94a3b8)); frame.position.set(0, 3.4, -3.15); scene.add(frame);
    const top = new THREE.Mesh(new THREE.BoxGeometry(10, 0.12, 4.4), std(0x334155, { roughness: 0.55 })); top.position.y = TOP - 0.06; top.receiveShadow = true; top.castShadow = true; scene.add(top);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(10.04, 0.04, 4.44), std(0x94a3b8, { metalness: 0.6 })); edge.position.y = TOP - 0.01; scene.add(edge);
    const cupboard = new THREE.Mesh(new THREE.BoxGeometry(9.8, TOP - 0.12, 4.2), std(0x8b5e34, { roughness: 0.8 })); cupboard.position.y = (TOP - 0.12) / 2; cupboard.receiveShadow = true; scene.add(cupboard);
    [-3.3, -1.1, 1.1, 3.3].forEach((x) => { const door = new THREE.Mesh(new THREE.BoxGeometry(2.05, TOP - 0.25, 0.02), std(0x7c4d26)); door.position.set(x, (TOP - 0.12) / 2, 2.11); scene.add(door); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std(0xd1d5db, { metalness: 0.9 })); knob.position.set(x + 0.8, TOP * 0.55, 2.14); scene.add(knob); });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.6), std(0x8b5e34)); shelf.position.set(0, 2.5, -2.9); shelf.castShadow = true; scene.add(shelf);
    [[-3.6, 0x60a5fa], [-3.1, 0xfbbf24], [-2.6, 0xf472b6], [2.6, 0x34d399], [3.1, 0xa78bfa], [3.6, 0xf87171]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 16), std(c as number, { transparent: true, opacity: 0.8 })); b.position.set(x as number, 2.74, -2.9); b.castShadow = true; scene.add(b); });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);
    const wires = new THREE.Group(); scene.add(wires);

    const models = new Map<string, { m: Model; label: THREE.Sprite; labelKey: string; target: THREE.Vector3; side: number }>();
    function place(items: Item[], pos: Pos, bench: BenchState) {
      items.forEach((it, i) => {
        const e = models.get(it.id); if (!e) return;
        const s = bench.slots[it.id] ?? {};
        let p = toWorld(pos[it.id] ?? { x: 2 + (i % 7) * 14, y: i < 7 ? 38 : 2 + Math.floor((i - 7) / 7) * 16 });
        // Assembled: a vessel on its heater, a thermometer standing in its vessel.
        e.side = 0;
        if (s.heat && models.get(s.heat)) { const h = models.get(s.heat)!; p = h.target.clone(); p.y = TOP + h.m.height; e.side = -0.75; }
        if (s.inside && models.get(s.inside)) { const v = models.get(s.inside)!; p = v.target.clone().add(new THREE.Vector3(0.12, 0.15, 0)); e.side = 0.8; }
        e.target.copy(p);
      });
    }
    function sync(items: Item[], pos: Pos, bench: BenchState, sel: string | null) {
      for (const [id, e] of models) if (!items.some((x) => x.id === id)) { scene.remove(e.m.group, e.label); e.m.dispose(); (e.label.material as THREE.SpriteMaterial).map?.dispose(); models.delete(id); }
      for (const it of items) if (!models.has(it.id)) {
        const m = build(it); const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(it.name), depthTest: false, transparent: true })); label.scale.set(1.1, 0.275, 1); label.renderOrder = 10;
        scene.add(m.group, label); const t = toWorld({ x: 0, y: 0 }); m.group.position.copy(t);
        models.set(it.id, { m, label, labelKey: it.name, target: t.clone(), side: 0 });
      }
      place(items, pos, bench);
      for (const it of items) {
        const e = models.get(it.id)!, s = bench.slots[it.id] ?? {};
        e.m.update(s, performance.now() / 1000);
        const sub = s.reading ?? (s.liquid ? `${Math.round(s.liquid.T)} °C` : "");
        const key = `${it.name}|${sub}`;
        if (key !== e.labelKey) { const mat = e.label.material as THREE.SpriteMaterial; mat.map?.dispose(); mat.map = labelTexture(it.name, sub); mat.needsUpdate = true; e.labelKey = key; e.label.scale.set(1.1, sub ? 0.275 * 1.0 : 0.275, 1); }
      }
      // Wires: the circuit's parts in order, joined by red leads (current flowing: glowing).
      wires.children.forEach((c) => { const m = c as THREE.Mesh; m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      wires.clear();
      const chain = bench.wires.map((id) => models.get(id)).filter(Boolean) as { target: THREE.Vector3 }[];
      const live = bench.wires.some((id) => (bench.slots[id]?.glow ?? 0) > 0 || bench.slots[id]?.spin || /A$/.test(bench.slots[id]?.reading ?? ""));
      for (let k = 1; k < chain.length; k++) {
        const a = chain[k - 1].target.clone().setY(TOP + 0.05), b = chain[k].target.clone().setY(TOP + 0.05), mid = a.clone().lerp(b, 0.5).setY(TOP + 0.35);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.022, 8), new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: live ? 0xfde047 : 0x000000, emissiveIntensity: live ? 0.6 : 0 }));
        tube.castShadow = true; wires.add(tube);
      }
      const s = sel ? models.get(sel) : null; ring.visible = !!s; if (s) ring.position.copy(s.target).setY(TOP + 0.01);
    }
    api.current = { sync };

    // Picking and dragging.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP), hitP = new THREE.Vector3();
    let drag: { id: string; x0: number; y0: number; moved: boolean } | null = null, blank: { x: number; y: number } | null = null;
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects([...models.values()].map((x) => x.m.group), true);
      return hits.find((h) => h.object.userData.id)?.object.userData.id as string | undefined;
    };
    const down = (e: PointerEvent) => { const id = pick(e); if (!id) { blank = { x: e.clientX, y: e.clientY }; return; } drag = { id, x0: e.clientX, y0: e.clientY, moved: false }; controls.enabled = false; };
    const move = (e: PointerEvent) => {
      if (!drag) return; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true; if (!drag.moved) return;
      const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hitP)) { const m = models.get(drag.id); if (m) { hitP.x = Math.max(-4.6, Math.min(4.6, hitP.x)); hitP.z = Math.max(-2, Math.min(1.9, hitP.z)); m.target.copy(hitP); m.target.y = TOP + 0.25; } }
    };
    const up = (e: PointerEvent) => {
      controls.enabled = true;
      if (!drag) { if (blank && Math.hypot(e.clientX - blank.x, e.clientY - blank.y) < 6) cb.current.onTap(null); blank = null; return; }
      const d = drag; drag = null;
      if (!d.moved) { cb.current.onTap(d.id); return; }
      const me = models.get(d.id)!; let best: string | null = null, bestD = 0.75;
      for (const [id, e2] of models) { if (id === d.id) continue; const dist = Math.hypot(e2.target.x - me.target.x, e2.target.z - me.target.z); if (dist < bestD) { bestD = dist; best = id; } }
      me.target.y = TOP;
      if (best) cb.current.onDrop(d.id, best); else cb.current.onMove(d.id, toLayout(me.target));
    };
    renderer.domElement.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);

    const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%"; camera.aspect = w / Math.max(1, h); if (w < 500) camera.position.set(0, 5.2, 9.4); camera.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(el);
    let raf = 0; const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const t = clock.getElapsedTime();
      for (const e of models.values()) {
        e.m.group.position.lerp(e.target, 0.18);
        e.m.animate(t);
        e.label.position.set(e.m.group.position.x + e.side, e.m.group.position.y + e.m.height + (e.side ? -0.2 : 0.28), e.m.group.position.z);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      for (const e of models.values()) e.m.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[]; (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose()); } });
      renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, []);
  useEffect(() => { api.current?.sync(items, pos, bench, sel); }, [items, pos, bench, sel]);
  return <div ref={host} role="img" aria-label="My bench in 3D — drag a piece onto another to use them together; drag the empty space to look round" className="h-[22rem] w-full overflow-hidden rounded-2xl ring-1 ring-white/15 sm:h-[28rem]" />;
}
