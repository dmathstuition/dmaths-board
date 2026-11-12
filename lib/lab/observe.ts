// Recording observations the way a scientist does: say what you saw, heard,
// smelt or measured — before and after, with units — and keep the "why" for
// the conclusion. A learner's observation is checked kindly: what's good, and
// what to add. Pure, so it can be tested.

export type Subject = "physics" | "chemistry" | "biology" | "maths";
export type Observation = { step: number; text: string; ok: boolean; tips: string[]; free?: boolean }; // free: added from the notebook, not after a step

// What to look for, with your senses (never taste; waft to smell).
export const LOOK_FOR: Record<Subject, string[]> = {
  chemistry: ["Colour — from what, to what", "Bubbles or fizzing", "A solid forming (precipitate) — its colour", "Getting hotter or colder (°C)", "A smell (waft it — never sniff)", "A solid disappearing (dissolving)"],
  physics: ["The reading on the scale, with its unit", "Something moving, turning or swinging — how fast, how far", "A lamp lighting — brighter or dimmer", "Getting hotter (°C)", "A sound — louder, higher or lower", "How the reading changes when you change something"],
  biology: ["Colour — from what, to what", "What you see under the microscope — shape, size, parts", "Bubbles of gas", "A change in length, mass or size (with units)", "How long something takes (s or min)", "Living things moving or responding"],
  maths: ["What you counted or measured, with its unit", "A pattern — what goes up, what goes down", "How often each result came up", "Anything that didn't fit the pattern"],
};

// Sentence starters: tap one to start writing.
export const STARTERS: Record<Subject, string[]> = {
  chemistry: ["The colour changed from … to …", "Bubbles were given off", "A … precipitate formed", "The temperature rose from … °C to … °C", "The solid dissolved and the solution turned …"],
  physics: ["The reading was … (unit)", "When I increased …, the … increased from … to …", "The lamp lit / got brighter", "It took … s for …", "The reading did not change"],
  biology: ["The colour changed from … to …", "Under the microscope I saw …", "The length changed from … mm to … mm", "Bubbles of gas were given off", "It took … minutes for …"],
  maths: ["I counted …", "The measurement was … (unit)", "As … went up, … went up/down", "… came up most often"],
};

const UNITS = /^(m|cm|mm|km|nm|µm|um|cm3|cm³|dm3|dm³|m3|m³|ml|mL|l|L|g|kg|mg|s|sec|secs|seconds?|mins?|minutes?|h|hours?|°c|°|c|k|v|a|ma|ω|ohms?|n|j|kj|w|hz|%|mol|drops?|bubbles?|cells?|squares?|times|degrees?|units?|pa|kpa|newtons?|volts?|amps?|joules?|watts?|grams?|metres?|meters?|days?|turns?|swings?|oscillations?)$/i;

// Check one observation: is it an observation (not an explanation), specific,
// with a before and after for a change, and a unit with every measurement?
export function checkObservation(text: string): { ok: boolean; tips: string[]; good: string[] } {
  const t = String(text ?? "").trim(), low = t.toLowerCase();
  const words = low.split(/\s+/).filter(Boolean);
  const tips: string[] = [], good: string[] = [];
  if (words.length < 3) tips.push("Say more: what exactly did you see, hear, smell or measure?");
  if (/\b(because|due to|this means|therefore|so that|this shows|which means|proves)\b/.test(low)) tips.push("That's explaining why. An observation only says what you saw — keep the “why” for your conclusion.");
  if (/\b(something|stuff|things?) (happened|changed)|\bit (reacted|worked|happened)\b|\bnothing much\b/.test(low)) tips.push("Be specific: what exactly happened? Name the colour, the bubbles, the solid, the reading…");
  if (/\b(changed|turned|went|became)\b/.test(low) && !/\bfrom\b.*\bto\b/.test(low) && !/\b(more|less|bigger|smaller|hotter|colder|brighter|dimmer|faster|slower)\b/.test(low)) tips.push("Say what it changed from and to — e.g. “from blue to colourless”.");
  // A number with nothing after it (or "and", "then", a full stop) has lost its unit.
  const tokens = t.replace(/[,;:!?)]|\.(?!\d)/g, (m) => ` ${m} `).split(/\s+/).filter(Boolean);
  let bare = false, measured = false;
  tokens.forEach((w, i) => {
    if (!/^-?\d+(\.\d+)?$/.test(w)) { if (/^-?\d+(\.\d+)?[a-zµ°%³Ω]+$/i.test(w)) measured = true; return; }
    const next = tokens[i + 1] ?? "";
    if (UNITS.test(next) || (next === "°" && /^c$/i.test(tokens[i + 2] ?? ""))) measured = true;
    else if (!next || /^[.,;:!?)]$/.test(next) || /^(and|then|but|after|before|when)$/i.test(next)) bare = true;
  });
  if (bare) tips.push("Give the unit with every number — cm³, °C, g, s, mm…");
  if (measured) good.push("Measurements have units.");
  if (/\bfrom\b.*\bto\b/.test(low)) good.push("Says what it changed from and to.");
  if (/\b(colou?r|red|orange|yellow|green|blue|purple|violet|pink|brown|black|white|colourless|clear|cloudy|milky)\b/.test(low)) good.push("Names a colour.");
  return { ok: tips.length === 0, tips, good };
}
