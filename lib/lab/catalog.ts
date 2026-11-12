// ── NOVELIA E-LABORATORY — single source of truth ─────────────────────────
// Every experiment in the e-lab is listed here.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │  ✏️  TO ADD AN EXPERIMENT                                             │
// │  1. Build it in components/lab/experiments/<Name>.tsx                │
// │  2. Register the component in components/lab/ExperimentHost.tsx      │
// │  3. Add an entry below (status "new" shows a NEW ribbon; "soon"      │
// │     shows a locked coming-soon tile and needs no component yet).     │
// └──────────────────────────────────────────────────────────────────────┘

export type LabSubject = "maths" | "physics" | "chemistry" | "biology";
export type LabStatus = "live" | "new" | "soon";

export const SUBJECTS: Record<LabSubject, { label: string; color: string; area: "maths" | "science" }> = {
  maths: { label: "Mathematics", color: "#38BDF8", area: "maths" },
  physics: { label: "Physics", color: "#F59E0B", area: "science" },
  chemistry: { label: "Chemistry", color: "#F472B6", area: "science" },
  biology: { label: "Biology", color: "#84CC16", area: "science" },
};

export type LabEntry = {
  slug: string;
  title: string;
  subject: LabSubject;
  blurb: string;
  emoji: string;
  level: string;        // who it's pitched at
  status?: LabStatus;   // omit for a normal live experiment
  practical?: boolean;  // a hands-on practical on the lab bench (components/lab/bench)
};

export const LAB: LabEntry[] = [
  // ── Mathematics ──
  { slug: "probability", title: "Is the Dice Fair?", subject: "maths", emoji: "🎲", level: "JSS 1 – SS 3", status: "new", practical: true,
    blurb: "Roll a dice 20, 100 and 500 times, keep a tally, work out relative frequencies and decide if it's biased." },
  { slug: "pythagoras", title: "Pythagoras: Which Corner Is Square?", subject: "maths", emoji: "📐", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Measure two triangles with a ruler, test a² + b² = c² and check the right angle with a protractor." },
  { slug: "statistics", title: "Averages: Measuring Leaves", subject: "maths", emoji: "📊", level: "JSS 1 – SS 3", status: "new", practical: true,
    blurb: "Measure leaves with a ruler, then work out the mean, median and range of all ten." },
  { slug: "transformations", title: "Transformations with Tracing Paper", subject: "maths", emoji: "🔄", level: "JSS 3 – SS 2", status: "new", practical: true,
    blurb: "Slide, flip and turn tracing paper on a grid to translate, reflect and rotate a triangle, and read the new coordinates." },
  { slug: "quadratics", title: "Quadratics: The Biggest Rectangle", subject: "maths", emoji: "📈", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Make rectangles from a 40 cm loop of string, measure their areas, plot the parabola and find the biggest." },
  { slug: "unit-circle", title: "Sine from a Turning Wheel", subject: "maths", emoji: "🌀", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Turn a wheel, measure the height of a dot on its rim at each angle, and watch a sine curve appear." },

  { slug: "circle-theorems", title: "Circle Theorems with a Protractor", subject: "maths", emoji: "⭕", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Measure angles at the centre, at the circumference and in a semicircle to discover the circle theorems." },
  { slug: "linear-graphs", title: "Straight Lines: Stacking Cups", subject: "maths", emoji: "📉", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Measure a stack of cups as it grows, plot a straight line, find y = mx + c and predict 20 cups." },
  { slug: "mensuration", title: "Volume of a Tin Can", subject: "maths", emoji: "🧊", level: "JSS 2 – SS 3", status: "new", practical: true,
    blurb: "Measure a tin's diameter and height, calculate πr²h, then check it by pouring its water into a measuring cylinder." },
  { slug: "fractions", title: "Fractions: Folding a Strip", subject: "maths", emoji: "🧱", level: "Primary 4 – JSS 2", status: "new", practical: true,
    blurb: "Fold a paper strip into halves, thirds, quarters and eighths, measure fractions of it and compare them." },
  { slug: "polygons", title: "Angles in a Polygon", subject: "maths", emoji: "🔷", level: "JSS 1 – SS 1", status: "new", practical: true,
    blurb: "Measure the angles of a pentagon with a protractor, add them up and find the rule for any polygon." },
  // ── Physics ──
  { slug: "pendulum", title: "Simple Pendulum", subject: "physics", emoji: "⏱️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Set the length, time 10 swings with a stopwatch, plot T² against L and find g." },
  { slug: "circuits", title: "Ohm's Law", subject: "physics", emoji: "💡", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Wire in an ammeter and voltmeter, set the power supply from 1 to 6 V, read the meters and find the resistance." },
  { slug: "density", title: "Density of a Stone", subject: "physics", emoji: "🧊", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Weigh a stone, measure its volume by displacement in a measuring cylinder and work out its density." },
  { slug: "projectile", title: "Projectile Motion: The Launcher", subject: "physics", emoji: "🚀", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Fire a ball from a spring launcher at 15° to 75°, measure where it lands on the metre rules and find the best angle." },
  { slug: "hooke", title: "Hooke's Law", subject: "physics", emoji: "🪝", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Hang 1 N masses on a spring, read the pointer on the rule each time and find the spring constant." },
  { slug: "refraction", title: "Refraction in a Glass Block", subject: "physics", emoji: "🔦", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Shine a ray box into a glass block, measure angles with a protractor and find the refractive index." },

  { slug: "moments", title: "Principle of Moments", subject: "physics", emoji: "⚖️", level: "JSS 3 – SS 2", status: "new", practical: true,
    blurb: "Hang a 100 g mass on a metre rule balanced on a pivot, slide the unknown mass until it balances and find it." },
  { slug: "lens", title: "Convex Lens", subject: "physics", emoji: "🔍", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Slide a lens and screen along an optical bench until the image is sharp, measure u and v and find f." },
  { slug: "heating-curve", title: "Heating Curve of Water", subject: "physics", emoji: "🌡️", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Heat crushed ice on a hotplate, read the thermometer every minute and explain the flat parts of the graph." },
  { slug: "waves", title: "Ripple Tank", subject: "physics", emoji: "🌊", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Set the frequency, measure 10 wavelengths of the water waves on the paper below and find their speed." },
  { slug: "free-fall", title: "Free Fall & g", subject: "physics", emoji: "🪂", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Drop a steel ball from an electromagnet onto a trapdoor timer at different heights and find g." },
  { slug: "specific-heat", title: "Specific Heat Capacity", subject: "physics", emoji: "♨️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Heat an aluminium block with an immersion heater, read the joulemeter and thermometer and find c." },
  { slug: "wire-resistance", title: "Resistance of a Wire", subject: "physics", emoji: "🔌", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Slide a crocodile clip along a constantan wire, read the ammeter and show resistance is proportional to length." },
  { slug: "electromagnet", title: "Electromagnets", subject: "physics", emoji: "🧲", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Wind 10 to 50 turns of wire round an iron nail and count the paperclips it picks up." },
  { slug: "insulation", title: "Insulation & Cooling", subject: "physics", emoji: "🧣", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Wrap beakers of hot water in newspaper and cotton wool, plot their cooling curves and find the best insulator." },
  { slug: "terminal-velocity", title: "Terminal Velocity in Oil", subject: "physics", emoji: "🛢️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Drop ball bearings down a tube of oil, time them between bands and find their terminal velocity." },
  { slug: "vernier-callipers", title: "Reading Vernier Callipers", subject: "physics", emoji: "📏", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Find the zero error, then measure a marble, a brass rod and the inside of a test tube to 0.01 cm — and work out the marble's volume." },
  { slug: "micrometer", title: "Micrometer Screw Gauge", subject: "physics", emoji: "🔩", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Close it with the ratchet, read the sleeve and thimble, measure a wire in three places and find its cross-sectional area." },
  { slug: "callipers", title: "Outside & Inside Callipers", subject: "physics", emoji: "🦵", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Carry a pipe's outside and inside diameters to a metre rule with callipers, and work out the thickness of its wall." },
  { slug: "archimedes", title: "Archimedes' Principle", subject: "physics", emoji: "⚖️", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Weigh a stone in air and in water with a spring balance, catch the water from a eureka can and compare upthrust with the water's weight." },
  // ── Chemistry ──
  { slug: "titration", title: "Acid–Alkali Titration", subject: "chemistry", emoji: "🧪", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Fill a burette, pipette the alkali, add indicator and titrate drop by drop to find an acid's concentration." },
  { slug: "reactivity", title: "Reactivity of Metals", subject: "chemistry", emoji: "⚗️", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Add magnesium, zinc, iron and copper to dilute acid, watch them fizz and put them in order of reactivity." },
  { slug: "rates", title: "Rates of Reaction", subject: "chemistry", emoji: "⏲️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Time a cross disappearing under cloudy sulfur as you change the thiosulfate concentration, and plot the rate." },
  { slug: "gas-laws", title: "Boyle's Law", subject: "chemistry", emoji: "🎈", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Pump up the pressure on air trapped above oil, read its volume on the scale and show p × V stays constant." },

  { slug: "electrolysis", title: "Electrolysis of CuSO₄", subject: "chemistry", emoji: "🔋", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Weigh a copper cathode, pass 0.50 A through copper sulfate for 30 minutes and find the copper deposited." },
  { slug: "chromatography", title: "Paper Chromatography", subject: "chemistry", emoji: "🖊️", level: "JSS 3 – SS 2", status: "new", practical: true,
    blurb: "Spot inks on a pencil line, let the solvent rise, measure Rf values and find which inks are in mixture X." },
  { slug: "flame-tests", title: "Flame Tests", subject: "chemistry", emoji: "🔥", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Light a Bunsen, open the air hole, hold salts on a nichrome loop in the flame and identify an unknown." },
  { slug: "ph-indicators", title: "pH & Indicators", subject: "chemistry", emoji: "🧫", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Add universal indicator to six solutions, read their pH from the colour chart and measure X with a pH meter." },
  { slug: "neutralisation", title: "Neutralisation & Temperature", subject: "chemistry", emoji: "🌡️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Add sodium hydroxide 5 cm³ at a time to acid in a polystyrene cup and use the temperature peak to find its concentration." },
  { slug: "salts", title: "Making Copper Sulfate Crystals", subject: "chemistry", emoji: "💎", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Warm acid, add copper oxide in excess, filter, evaporate and grow blue crystals of copper sulfate." },
  { slug: "gas-syringe", title: "Rates: Gas Syringe", subject: "chemistry", emoji: "💨", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Collect carbon dioxide from marble chips and powder in a gas syringe every 30 s and compare the curves." },
  { slug: "ion-tests", title: "Tests for Ions", subject: "chemistry", emoji: "🧫", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Identify Cu²⁺, Fe²⁺ and Fe³⁺ with sodium hydroxide and Cl⁻, Br⁻ and I⁻ with silver nitrate." },
  // ── Biology ──
  { slug: "photosynthesis", title: "Photosynthesis", subject: "biology", emoji: "🌿", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Move a lamp closer to pondweed, count the oxygen bubbles each minute and find how light intensity affects the rate." },
  { slug: "cells", title: "Onion Cells Under a Microscope", subject: "biology", emoji: "🔬", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Peel onion skin, stain it with iodine, add a coverslip, focus the microscope and measure a cell." },
  { slug: "osmosis", title: "Osmosis in Potato", subject: "biology", emoji: "🥔", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Bore potato cylinders, weigh them, soak them in sucrose, reweigh and find the isotonic point from your graph." },
  { slug: "enzymes", title: "Enzyme Activity", subject: "biology", emoji: "🧬", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Mix amylase and starch at different temperatures, test a drop with iodine every 30 seconds and find the optimum." },
  { slug: "food-tests", title: "Food Tests", subject: "biology", emoji: "🍞", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Benedict's in a water bath, iodine on a spotting tile and biuret — record each result and identify what milk contains." },
  { slug: "transpiration", title: "Transpiration (Potometer)", subject: "biology", emoji: "🍃", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Time an air bubble in a potometer with a fan, a lamp and a plastic bag and compare the rates of water loss." },
  { slug: "genetics", title: "Genetic Cross with Beads", subject: "biology", emoji: "🧬", level: "SS 2 – SS 3", status: "new", practical: true,
    blurb: "Draw beads from two Bb parent bags to make offspring, tally BB, Bb and bb, and compare with the Punnett square's 3 : 1." },
  { slug: "heart-rate", title: "Exercise & Heart Rate", subject: "biology", emoji: "❤️", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Take your pulse at rest, after 2 minutes of step-ups and each minute of recovery, and plot the recovery curve." },
  { slug: "yeast", title: "Respiration in Yeast", subject: "biology", emoji: "🍞", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Count carbon dioxide bubbles from yeast at 20–60 °C, watch the limewater turn cloudy and find the best temperature." },
  { slug: "leaf-starch", title: "Testing a Leaf for Starch", subject: "biology", emoji: "🍃", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Boil a variegated leaf, decolourise it in hot ethanol, add iodine and show chlorophyll is needed." },
  { slug: "quadrats", title: "Quadrat Sampling", subject: "biology", emoji: "🌼", level: "JSS 2 – SS 3", status: "new", practical: true,
    blurb: "Throw quadrats at random in a field, count the daisies and estimate the whole population." },
  { slug: "reaction-time", title: "Reaction Time: Ruler Drop", subject: "biology", emoji: "⏱️", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Catch a falling ruler six times, work out your reaction time and compare your two hands." },
];

export function findExperiment(slug: string): LabEntry | undefined {
  return LAB.find((e) => e.slug === slug);
}

export function experimentsFor(area: "maths" | "science"): LabEntry[] {
  return LAB.filter((e) => SUBJECTS[e.subject].area === area);
}
