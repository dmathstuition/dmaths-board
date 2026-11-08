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
  { slug: "probability", title: "Probability Lab", subject: "maths", emoji: "🎲", level: "JSS 1 – SS 3",
    blurb: "Flip coins, roll dice and spin spinners thousands of times — watch experiment meet theory." },
  { slug: "pythagoras", title: "Pythagoras Explorer", subject: "maths", emoji: "📐", level: "JSS 2 – SS 2",
    blurb: "Stretch a right-angled triangle and see why a² + b² = c² with real squares." },
  { slug: "statistics", title: "Data & Averages", subject: "maths", emoji: "📊", level: "JSS 1 – SS 3",
    blurb: "Build a data set and watch the mean, median, mode and range respond live." },
  { slug: "transformations", title: "Transformations", subject: "maths", emoji: "🔄", level: "JSS 3 – SS 2", status: "new",
    blurb: "Reflect, rotate, translate and enlarge shapes on a grid — and watch the coordinates change." },
  { slug: "quadratics", title: "Quadratic Graphs", subject: "maths", emoji: "📈", level: "SS 1 – SS 3", status: "new",
    blurb: "Slide a, b and c to reshape a parabola; find its roots, turning point and discriminant." },
  { slug: "unit-circle", title: "Unit Circle & Trig", subject: "maths", emoji: "🌀", level: "SS 1 – SS 3", status: "new",
    blurb: "Spin a point round the unit circle and watch sine and cosine waves draw themselves." },

  { slug: "circle-theorems", title: "Circle Theorems", subject: "maths", emoji: "⭕", level: "SS 1 – SS 3", status: "new",
    blurb: "Drag points round a circle to prove the angle at the centre, semicircle and same-segment theorems." },
  { slug: "linear-graphs", title: "Lines & Simultaneous Equations", subject: "maths", emoji: "📉", level: "JSS 2 – SS 2", status: "new",
    blurb: "Tune m and c in y = mx + c and watch two lines meet at the solution — or never meet." },
  { slug: "mensuration", title: "Volumes & Surface Area", subject: "maths", emoji: "🧊", level: "JSS 2 – SS 3", status: "new",
    blurb: "Resize cylinders, cones, spheres and cuboids and see their volume and surface area change." },
  { slug: "fractions", title: "Fraction Wall", subject: "maths", emoji: "🧱", level: "Primary 4 – JSS 2", status: "new",
    blurb: "Build fractions on a wall to see equivalents, compare sizes and add them — no common-denominator guesswork." },
  { slug: "polygons", title: "Angles in Polygons", subject: "maths", emoji: "🔷", level: "JSS 1 – SS 1", status: "new",
    blurb: "Split polygons into triangles to discover the interior-angle sum, and why exterior angles always make 360°." },
  // ── Physics ──
  { slug: "pendulum", title: "Simple Pendulum", subject: "physics", emoji: "⏱️", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Set the length, time 10 swings with a stopwatch, plot T² against L and find g." },
  { slug: "circuits", title: "Ohm's Law", subject: "physics", emoji: "💡", level: "JSS 3 – SS 3", status: "new", practical: true,
    blurb: "Wire in an ammeter and voltmeter, set the power supply from 1 to 6 V, read the meters and find the resistance." },
  { slug: "density", title: "Density of a Stone", subject: "physics", emoji: "🧊", level: "JSS 1 – SS 2", status: "new", practical: true,
    blurb: "Weigh a stone, measure its volume by displacement in a measuring cylinder and work out its density." },
  { slug: "projectile", title: "Projectile Motion", subject: "physics", emoji: "🚀", level: "SS 1 – SS 3", status: "new",
    blurb: "Launch at any speed and angle, on Earth or the Moon — find the angle for maximum range." },
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
  // ── Biology ──
  { slug: "photosynthesis", title: "Photosynthesis", subject: "biology", emoji: "🌿", level: "JSS 3 – SS 3",
    blurb: "Count pondweed bubbles as you change light, CO₂ and temperature — find the limiting factor." },
  { slug: "cells", title: "Cell Explorer", subject: "biology", emoji: "🔬", level: "JSS 1 – SS 2", status: "new",
    blurb: "Tap the organelles of plant and animal cells, learn their jobs, then quiz yourself." },
  { slug: "osmosis", title: "Osmosis in Potato", subject: "biology", emoji: "🥔", level: "SS 1 – SS 3", status: "new", practical: true,
    blurb: "Bore potato cylinders, weigh them, soak them in sucrose, reweigh and find the isotonic point from your graph." },
  { slug: "enzymes", title: "Enzyme Activity", subject: "biology", emoji: "🧬", level: "SS 1 – SS 3", status: "new",
    blurb: "Time starch digestion with iodine at different temperatures and pH — find the optimum." },
  { slug: "food-tests", title: "Food Tests", subject: "biology", emoji: "🍞", level: "JSS 2 – SS 2", status: "new", practical: true,
    blurb: "Benedict's in a water bath, iodine on a spotting tile and biuret — record each result and identify what milk contains." },
  { slug: "transpiration", title: "Transpiration (Potometer)", subject: "biology", emoji: "🍃", level: "SS 1 – SS 3", status: "new",
    blurb: "Time a bubble in a potometer while you change light, wind, humidity and temperature." },
  { slug: "genetics", title: "Monohybrid Cross", subject: "biology", emoji: "🧬", level: "SS 2 – SS 3", status: "new",
    blurb: "Pick parent genotypes, fill the Punnett square and breed offspring to see 3 : 1 appear." },
  { slug: "heart-rate", title: "Exercise & Heart Rate", subject: "biology", emoji: "❤️", level: "JSS 1 – SS 2", status: "new",
    blurb: "Walk, jog and sprint, plot your heart rate, then time the recovery — and see what fitness changes." },
];

export function findExperiment(slug: string): LabEntry | undefined {
  return LAB.find((e) => e.slug === slug);
}

export function experimentsFor(area: "maths" | "science"): LabEntry[] {
  return LAB.filter((e) => SUBJECTS[e.subject].area === area);
}
