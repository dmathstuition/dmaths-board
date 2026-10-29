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
  { slug: "pendulum", title: "Simple Pendulum", subject: "physics", emoji: "⏱️", level: "SS 1 – SS 3",
    blurb: "Change length and gravity, time the swings and discover T = 2π√(L/g)." },
  { slug: "circuits", title: "Ohm's Law Circuit", subject: "physics", emoji: "💡", level: "JSS 3 – SS 3",
    blurb: "Dial up voltage and resistance, light the bulb and plot V against I." },
  { slug: "density", title: "Sink or Float", subject: "physics", emoji: "🧊", level: "Primary 5 – JSS 3",
    blurb: "Drop objects into different liquids and predict what floats using density." },
  { slug: "projectile", title: "Projectile Motion", subject: "physics", emoji: "🚀", level: "SS 1 – SS 3", status: "new",
    blurb: "Launch at any speed and angle, on Earth or the Moon — find the angle for maximum range." },
  { slug: "hooke", title: "Hooke's Law", subject: "physics", emoji: "🪝", level: "JSS 3 – SS 3", status: "new",
    blurb: "Hang masses on a spring, plot load against extension and find the elastic limit." },
  { slug: "refraction", title: "Refraction & TIR", subject: "physics", emoji: "🔦", level: "SS 1 – SS 3", status: "new",
    blurb: "Shine a ray through water, glass and diamond — discover Snell's law and the critical angle." },

  { slug: "moments", title: "Principle of Moments", subject: "physics", emoji: "⚖️", level: "JSS 3 – SS 2", status: "new",
    blurb: "Hang masses on a metre rule, balance it, then find a mystery mass using m₁d₁ = m₂d₂." },
  { slug: "lens", title: "Convex Lens", subject: "physics", emoji: "🔍", level: "SS 1 – SS 3", status: "new",
    blurb: "Slide an object along the bench and watch the ray diagram, image distance and magnification." },
  { slug: "heating-curve", title: "Heating Curve of Water", subject: "physics", emoji: "🌡️", level: "JSS 3 – SS 3", status: "new",
    blurb: "Heat ice to steam, plot temperature against time and measure latent heat from the plateaus." },
  { slug: "waves", title: "Waves: v = fλ", subject: "physics", emoji: "🌊", level: "SS 1 – SS 3", status: "new",
    blurb: "Change frequency, amplitude and medium and see how wavelength and period respond." },
  { slug: "free-fall", title: "Free Fall & g", subject: "physics", emoji: "🪂", level: "JSS 3 – SS 3", status: "new",
    blurb: "Drop a ball through a light gate on Earth, the Moon or Jupiter, time it and calculate g from your readings." },
  { slug: "specific-heat", title: "Specific Heat Capacity", subject: "physics", emoji: "♨️", level: "SS 1 – SS 3", status: "new",
    blurb: "Heat blocks of metal and water with an electric heater and measure how much energy each needs to warm up." },
  // ── Chemistry ──
  { slug: "titration", title: "Acid–Base Titration", subject: "chemistry", emoji: "🧪", level: "SS 1 – SS 3",
    blurb: "Run a burette into acid, watch the indicator flip and trace the pH curve." },
  { slug: "reactivity", title: "Reactivity Series", subject: "chemistry", emoji: "⚗️", level: "JSS 3 – SS 3", status: "new",
    blurb: "Drop metals into acids and water and rank them by how fiercely they react." },
  { slug: "rates", title: "Rates of Reaction", subject: "chemistry", emoji: "⏲️", level: "SS 1 – SS 3", status: "new",
    blurb: "Marble chips and acid: change temperature, concentration and surface area and collect the gas." },
  { slug: "gas-laws", title: "Gas Laws", subject: "chemistry", emoji: "🎈", level: "SS 1 – SS 3", status: "new",
    blurb: "Squeeze and heat a gas in a cylinder to discover Boyle's, Charles's and the pressure law." },

  { slug: "electrolysis", title: "Electrolysis of CuSO₄", subject: "chemistry", emoji: "🔋", level: "SS 1 – SS 3", status: "new",
    blurb: "Pass a current through copper sulfate, weigh the cathode and verify Faraday's first law." },
  { slug: "chromatography", title: "Paper Chromatography", subject: "chemistry", emoji: "🖊️", level: "JSS 3 – SS 2", status: "new",
    blurb: "Separate inks, measure Rf values and identify an unknown ink by its dyes." },
  { slug: "flame-tests", title: "Flame Tests", subject: "chemistry", emoji: "🔥", level: "SS 1 – SS 3", status: "new",
    blurb: "Hold metal salts in a Bunsen flame, learn their colours, then identify unknowns." },
  { slug: "ph-indicators", title: "pH & Indicators", subject: "chemistry", emoji: "🧫", level: "JSS 2 – SS 2", status: "new",
    blurb: "Test lemon juice, milk, bleach and more with litmus, phenolphthalein, methyl orange and universal indicator." },
  // ── Biology ──
  { slug: "photosynthesis", title: "Photosynthesis", subject: "biology", emoji: "🌿", level: "JSS 3 – SS 3",
    blurb: "Count pondweed bubbles as you change light, CO₂ and temperature — find the limiting factor." },
  { slug: "cells", title: "Cell Explorer", subject: "biology", emoji: "🔬", level: "JSS 1 – SS 2", status: "new",
    blurb: "Tap the organelles of plant and animal cells, learn their jobs, then quiz yourself." },
  { slug: "osmosis", title: "Osmosis in Potato", subject: "biology", emoji: "🥔", level: "SS 1 – SS 3", status: "new",
    blurb: "Soak potato cylinders in sugar solutions, weigh them and find the isotonic point." },
  { slug: "enzymes", title: "Enzyme Activity", subject: "biology", emoji: "🧬", level: "SS 1 – SS 3", status: "new",
    blurb: "Time starch digestion with iodine at different temperatures and pH — find the optimum." },
  { slug: "food-tests", title: "Food Tests", subject: "biology", emoji: "🍞", level: "JSS 2 – SS 2", status: "new",
    blurb: "Test foods with Benedict's, iodine, Biuret and ethanol and fill a nutrient results table." },
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
