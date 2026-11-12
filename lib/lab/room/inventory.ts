// The lab room's inventory: every piece of apparatus, specimen, model and
// substance for physics, chemistry, biology and maths, by section. Each one is
// driven by an engine (lib/lab/room/engines.ts) with its own properties, so it
// can be tried out, not just looked at.
import type { LabSubject } from "@/lib/lab/catalog";
import { decimals, uncertainty, type Hazard, type Spec } from "@/lib/lab/room/engines";

export type Item = {
  id: string; name: string; subject: LabSubject; sections: string[]; spec: Spec;
  about: string; use: string; safety: string; props: [string, string][]; icon: string;
  bench?: { kind: string; props?: Record<string, unknown> }; // drawn with the lab bench's own drawing
};
type O = { about?: string; use?: string; safety?: string; icon?: string; bench?: Item["bench"]; props?: [string, string][] };
type Def = { name: string; spec: Spec | null; o: O };

// ── Builders ──
const D = (name: string, spec: Spec, o: O = {}): Def => ({ name, spec, o });
const same = (name: string): Def => ({ name, spec: null, o: {} }); // listed again in another section
const scale = (name: string, min: number, max: number, lc: number, unit: string, what: string, o?: O) => D(name, { e: "scale", min, max, lc, unit, what }, o);
const vessel = (name: string, cap: number, tol: number, graduated: boolean, o?: O & { heat?: boolean }) => D(name, { e: "vessel", cap, tol, graduated, heat: o?.heat }, o);
const tool = (name: string, use: string, o?: O) => D(name, { e: "tool", use }, o);
const circuit = (name: string, part: Extract<Spec, { e: "circuit" }>["part"], value = 0, o?: O) => D(name, { e: "circuit", part, value }, o);
const optic = (name: string, part: Extract<Spec, { e: "optic" }>["part"], f?: number, n?: number, o?: O) => D(name, { e: "optic", part, f, n }, o);
const reagent = (name: string, formula: string, kind: Extract<Spec, { e: "reagent" }>["kind"], pH: number, hazards: Hazard[], ions: { cation?: string; anion?: string; gas?: string } = {}, o?: O) =>
  D(name, { e: "reagent", formula, kind, pH, hazards, ...ions }, o);
const ind = (name: string, i: Extract<Spec, { e: "indicator" }>["ind"], o?: O) => D(name, { e: "indicator", ind: i }, o);
const spec = (name: string, group: string, habitat: string, features: string[], o?: O) => D(name, { e: "specimen", group, habitat, features }, o);
const model = (name: string, parts: [string, string][], o?: O) => D(name, { e: "model", parts }, o);
const safe = (name: string, protects: Hazard[], use: string, o?: O) => D(name, { e: "safety", protects }, { ...o, use: o?.use ?? use });
const shape = (name: string, kind: Extract<Spec, { e: "shape" }>["kind"], sides?: number) => D(name, { e: "shape", kind, sides }, { icon: "🔷" });
const solid = (name: string, kind: Extract<Spec, { e: "solid" }>["kind"], sides?: number) => D(name, { e: "solid", kind, sides }, { icon: "🧊" });
const rand = (name: string, kind: Extract<Spec, { e: "random" }>["kind"], sides?: number, o?: O) => D(name, { e: "random", kind, sides }, o);
const money = (name: string, calc: Extract<Spec, { e: "money" }>["calc"]) => D(name, { e: "money", calc }, { icon: "💷" });
const graph = (name: string, fn: Extract<Spec, { e: "graph" }>["fn"], calculus?: "gradient" | "area" | "stationary") => D(name, { e: "graph", fn, calculus }, { icon: "📈" });
const statTool = (name: string) => D(name, { e: "stats" }, { icon: "📊" });

// ════════════════════════════════════════════════════════════════════════════
// PHYSICS
const PHYSICS: Record<string, Def[]> = {
  "Mechanics and motion": [
    scale("Metre rule", 0, 100, 0.1, "cm", "length", { icon: "📏", bench: { kind: "half-rule" } }),
    scale("Half-metre rule", 0, 50, 0.1, "cm", "length", { icon: "📏", bench: { kind: "half-rule" } }),
    scale("Ruler", 0, 30, 0.1, "cm", "length", { icon: "📏" }),
    scale("Vernier callipers", 0, 12, 0.01, "cm", "length, outside and inside diameters and depth", { icon: "📐", bench: { kind: "vernier", props: { h: 236 } } }),
    scale("Micrometer screw gauge", 0, 25, 0.01, "mm", "small diameters and thicknesses", { icon: "🔩", bench: { kind: "micrometer", props: { h: 82, wire: true } } }),
    scale("Measuring tape", 0, 1000, 1, "cm", "long distances", { icon: "📏" }),
    D("Stopwatch", { e: "timer", lc: 0.01 }, { icon: "⏱️", bench: { kind: "stopwatch", props: { t: 12.34 } } }),
    D("Digital timer", { e: "timer", lc: 0.001 }, { icon: "⏲️", bench: { kind: "timer", props: { t: 0.452 } } }),
    D("Ticker timer", { e: "timer", lc: 0.02 }, { icon: "🎞️", about: "Makes 50 dots a second on a paper tape, so each gap between dots is 0.02 s." }),
    tool("Ticker tape", "Paper tape pulled through a ticker timer; the spacing of the dots shows speed and acceleration."),
    tool("Dynamics trolley", "A low-friction trolley for studying motion, F = ma and collisions."),
    tool("Runway", "A long board the trolley runs down; tilt it to compensate for friction."),
    D("Inclined plane", { e: "graph", fn: "sin" }, { icon: "📐", about: "A ramp: the force down the slope is mg sin θ — plot it against the angle." }),
    tool("Retort stand", "Holds apparatus steady at the height you need, with a boss head and clamp.", { icon: "🗜️" }),
    tool("Boss head", "Fixes a clamp to the rod of a retort stand at any height."),
    tool("Clamp", "Grips apparatus (burettes, test tubes, thermometers) on a retort stand."),
    tool("Pendulum bob", "A small dense mass on a thread; its period depends only on the length (T = 2π√(l/g)).", { bench: { kind: "pendulum", props: { L: 0.6 } } }),
    tool("Pendulum thread", "Light, inextensible thread for a simple pendulum."),
    tool("Pendulum support", "Split cork or clamp that fixes the top of the pendulum exactly."),
    D("Spring", { e: "spring", k: 25, limit: 6 }, { icon: "🌀", bench: { kind: "spring-stand", props: { pos: 14, n: 2 } } }),
    scale("Spring balance", 0, 10, 0.1, "N", "force (weight)", { icon: "⚖️", bench: { kind: "spring-balance", props: { N: 1.4, stone: true } } }),
    scale("Newton meter", 0, 10, 0.1, "N", "force", { icon: "⚖️" }),
    tool("Slotted masses", "Masses (usually 100 g = about 1 N) that slot on a hanger to apply known forces.", { bench: { kind: "masses", props: { left: 4 } } }),
    tool("Mass hanger", "Holds slotted masses; it has its own mass (often 100 g).", { bench: { kind: "mass-hanger", props: { n: 2 } } }),
    scale("Beam balance", 0, 500, 0.1, "g", "mass (by comparing with standard masses)", { icon: "⚖️" }),
    scale("Electronic weighing balance", 0, 600, 0.01, "g", "mass", { icon: "⚖️", bench: { kind: "balance", props: { reading: 56.27 } } }),
    D("Lever apparatus", { e: "tool", use: "A metre rule on a pivot for the principle of moments: clockwise moments = anticlockwise moments." }, { bench: { kind: "beam", props: {} } }),
    tool("Pulley", "Changes the direction of a force; a single fixed pulley has a mechanical advantage of 1."),
    tool("Pulley system", "Several pulleys: velocity ratio = number of rope sections holding the load; efficiency = MA ÷ VR × 100%."),
    tool("Friction block", "A block pulled with a spring balance to measure friction; F = μR."),
    tool("Wooden block", "A block for friction, density and inclined-plane work."),
    tool("Ball bearings", "Small steel spheres for terminal velocity, free fall and density.", { bench: { kind: "ball" } }),
    tool("Marble", "A glass sphere — measure it with vernier callipers to find its volume.", { bench: { kind: "v-object", props: { shape: "ball", h: 180 } } }),
    tool("Bouncing ball", "Drop it and measure bounce heights to study energy losses."),
    tool("Centripetal force apparatus", "A bung whirled on a string through a tube: F = mv²/r."),
    tool("Rotational motion apparatus", "A turntable or flywheel for angular speed and moments of inertia."),
    tool("Collision trolley", "Trolleys with magnets or pins for elastic and inelastic collisions; momentum is conserved."),
    tool("Momentum track", "A track for collisions: measure speeds before and after to check momentum."),
    tool("Force table", "A circular table with pulleys: balance three forces to find a resultant by the parallelogram rule."),
    tool("G-clamp", "Clamps apparatus (a pulley, a stand) firmly to the edge of the bench."),
    D("Stop clock", { e: "timer", lc: 0.1 }, { icon: "🕰️" }),
    same("Retort stand"),
    tool("Circular motion apparatus", "Shows that a force towards the centre is needed for circular motion."),
    tool("Free-fall apparatus", "An electromagnet releases a ball; a trapdoor stops the timer: h = ½gt².", { bench: { kind: "drop-rig", props: { h: 0.8 } } }),
    tool("Projectile motion apparatus", "Launches a ball at set angles; range is greatest at 45°.", { bench: { kind: "launcher", props: { angle: 45 } } }),
    tool("Air track", "Air from tiny holes lifts gliders off the track so friction is almost zero."),
    tool("Air blower", "Supplies air to an air track."),
    D("Photogate sensor", { e: "timer", lc: 0.0001 }, { about: "A light beam and sensor: measures the time an object blocks the beam, so speed = length ÷ time." }),
    scale("Motion sensor", 0, 4, 0.01, "m", "distance (by ultrasound echoes)"),
    scale("Pressure gauge", 0, 300, 1, "kPa", "pressure"),
  ],
  "Electricity and electronics": [
    circuit("Dry cells", "cell", 1.5, { icon: "🔋" }), circuit("Batteries", "cell", 9, { icon: "🔋" }),
    tool("Battery holder", "Holds cells in series so their e.m.f.s add."),
    circuit("Connecting wires", "wire", 0.01, { icon: "🧵", bench: { kind: "wires" } }),
    tool("Crocodile clips", "Spring clips on leads for quick connections to wires and terminals."),
    circuit("Switch", "switch", 0, { icon: "🔘" }), circuit("Plug key", "switch", 0),
    scale("Ammeter", 0, 1, 0.02, "A", "current (connect in series)", { icon: "🅰️", bench: { kind: "dial-meter", props: { value: 0.42, max: 1, unit: "A", major: 0.1, minor: 0.02, every: 0.2 } } }),
    scale("Voltmeter", 0, 5, 0.1, "V", "potential difference (connect in parallel)", { icon: "🅥", bench: { kind: "dial-meter", props: { value: 2.6, max: 5, unit: "V", major: 0.5, minor: 0.1, every: 1 } } }),
    scale("Galvanometer", -50, 50, 1, "μA", "tiny currents, either way (centre zero)"),
    scale("Digital multimeter", 0, 20, 0.01, "V", "p.d., current or resistance (set the dial)", { bench: { kind: "meter", props: { reading: "3.27" } } }),
    circuit("Rheostat", "rheostat", 20, { icon: "🎚️" }), circuit("Variable resistor", "rheostat", 100),
    circuit("Fixed resistor", "resistor", 10, { bench: { kind: "resistor" } }), circuit("Resistor box", "rheostat", 1000), circuit("Potentiometer", "rheostat", 10),
    circuit("Electric bulb", "lamp", 0, { icon: "💡", bench: { kind: "lamp" } }), tool("Bulb holder", "Holds a bulb and connects it to the circuit."),
    circuit("LED", "led", 0, { icon: "🔴" }), circuit("Diode", "diode", 0), circuit("Capacitor", "capacitor", 470),
    tool("Inductor", "A coil that opposes changes in current (back e.m.f.)."),
    circuit("Transformer", "transformer", 0, { about: "Two coils on an iron core: Vs/Vp = Ns/Np. Works only with a.c." }),
    circuit("Fuse", "fuse", 3, { safety: "Choose a fuse rated just above the normal current." }),
    tool("Circuit board", "A board with terminals for building circuits neatly."), tool("Breadboard", "A board with linked holes for building circuits without soldering."),
    tool("Transistor", "A switch or amplifier: a small base current controls a large collector current."),
    D("Electromagnet", { e: "magnet", strength: 8 }, { about: "A coil round soft iron: magnetic only while a current flows; more turns or more current, stronger.", bench: { kind: "electromagnet", props: { turns: 30, on: true } } }),
    tool("Magnetic switch", "A reed switch: two contacts close when a magnet is near."),
    circuit("Electric bell", "bell", 3, { icon: "🔔" }), circuit("Electric motor", "motor", 0, { icon: "⚙️" }),
    tool("Electric generator", "Turning a coil in a magnetic field induces an e.m.f.: faster turning, bigger e.m.f."),
    circuit("AC power supply", "supply", 12, { safety: "Low voltage only; switch off before changing connections." }),
    circuit("DC power supply", "supply", 6, { bench: { kind: "power-supply" } }),
    D("Oscilloscope", { e: "wave", part: "signal", f: 50 }, { about: "Draws a graph of p.d. against time: measure peak voltage and the period (f = 1/T)." }),
    D("Signal generator", { e: "wave", part: "signal", f: 256 }, { bench: { kind: "signal-gen" } }),
    circuit("Resistance wire", "wire", 5, { about: "Constantan or nichrome: R = ρL/A, so resistance is proportional to length.", bench: { kind: "wire-board", props: { L: 60 } } }),
    circuit("Thermistor", "thermistor", 10_000), circuit("LDR", "ldr", 0),
    circuit("Relay", "relay", 6), circuit("Solar cell", "solar", 0, { icon: "☀️" }), circuit("Photocell", "solar", 0),
    tool("Rectifier", "Diodes that turn a.c. into d.c. (a bridge rectifier gives full-wave d.c.)."),
    circuit("Electric heater", "heater", 4, { bench: { kind: "heater" } }),
    tool("Circuit breaker", "Trips and breaks the circuit when the current is too high; reset it instead of replacing a fuse."),
    tool("Ammeter shunt", "A small resistor in parallel with a galvanometer, to read larger currents."),
    tool("Voltmeter multiplier", "A large resistor in series with a galvanometer, to read p.d.s."),
    tool("Induction coil", "Makes high voltages from a low-voltage supply by interrupting the current."),
    scale("Electrical energy meter", 0, 99999, 1, "J", "electrical energy (joulemeter)", { bench: { kind: "joulemeter", props: { J: 5400 } } }),
    tool("Circuit simulation board", "Build circuits and see currents and p.d.s — use the circuit parts above to test each one."),
  ],
  "Optics and light": [
    optic("Plane mirror", "plane", undefined, undefined, { icon: "🪞" }), optic("Concave mirror", "concave-mirror", 15), optic("Convex mirror", "convex-mirror", -15),
    optic("Glass prism", "prism", undefined, 1.5, { icon: "🔺" }), optic("Rectangular glass block", "block", undefined, 1.5, { icon: "🧊", bench: { kind: "ray-sheet", props: { on: true, i: 40, n: 1.5 } } }), optic("Triangular prism", "prism", undefined, 1.5),
    optic("Convex lens", "convex", 10, undefined, { icon: "🔍" }), optic("Concave lens", "concave", -10), optic("Cylindrical lens", "convex", 20),
    tool("Ray box", "Gives a narrow beam of light through a slit for ray-tracing.", { icon: "🔦" }),
    tool("Optical bench", "A long rule for lining up an object, lens and screen to measure u and v.", { bench: { kind: "optical-bench", props: { u: 30, s: 60, f: 15 } } }),
    tool("Lens holder", "Holds a lens upright on the bench or optical bench."), tool("Mirror holder", "Holds a mirror upright on the paper."),
    tool("Screen", "A white card for catching a real image."), tool("Candle", "A bright object for image experiments.", { safety: "Keep hair and paper away from the flame." }),
    tool("Light source", "A lamp with an illuminated object (often a cross-wire)."),
    tool("Laser pointer", "A narrow, bright, single-colour beam.", { safety: "Never look into the beam or point it at anyone's eyes." }),
    tool("Optical pins", "Pins stuck in a board to mark the path of a ray (no-parallax method)."), tool("Pin board", "A soft board to push optical pins into."),
    scale("Protractor", 0, 180, 1, "°", "angles", { icon: "📐" }),
    optic("Diffraction grating", "grating", undefined, undefined, { about: "Many fine slits: d sin θ = nλ spreads light into its colours." }),
    tool("Slit plate", "A plate with one or more narrow slits for ripple-tank and light diffraction."),
    optic("Double-slit apparatus", "grating", undefined, undefined, { about: "Two slits: bright and dark fringes show light is a wave (fringe spacing = λD/a)." }),
    optic("Polarising filter", "polariser"), optic("Colour filters", "filter"),
    tool("Spectrometer", "Measures the angles of the lines a grating or prism makes, to find wavelengths."),
    optic("Periscope", "plane", undefined, undefined, { about: "Two plane mirrors at 45°: see over a wall." }),
    optic("Fibre-optic cable", "fibre", undefined, 1.5), optic("Optical fibre apparatus", "fibre", undefined, 1.5),
    optic("Glass lens", "convex", 15), tool("Prism holder", "Holds a prism at the right height in a beam."),
    same("Retort stand"), tool("Illuminated object", "An object lit from behind (cross-wires) for lens experiments."),
    optic("Plane glass plate", "block", undefined, 1.5), optic("Shadow formation apparatus", "pinhole", undefined, undefined, { about: "A point source and obstacle: light travels in straight lines; an extended source gives umbra and penumbra." }),
  ],
  "Heat and thermal physics": [
    scale("Laboratory thermometer", -10, 110, 1, "°C", "temperature", { icon: "🌡️", bench: { kind: "thermo-beaker", props: { T: 66 } } }),
    scale("Digital thermometer", -50, 150, 0.1, "°C", "temperature (digital)", { icon: "🌡️" }),
    scale("Clinical thermometer", 35, 42, 0.1, "°C", "body temperature (a kink keeps the reading)", { icon: "🌡️" }),
    vessel("Calorimeter", 250, 10, false, { icon: "🥫", about: "A metal can with a lid and lagging, for measuring heat exchanges." }),
    vessel("Copper calorimeter", 250, 10, false, { about: "Copper (c = 390 J/kg °C) so it shares little of the heat; polished to reduce radiation." }),
    vessel("Beaker", 250, 12.5, false, { icon: "🥛", heat: true, bench: { kind: "beaker", props: { vol: 150, max: 250, colour: "#BFDBFE", liquid: "#BFDBFE" } } }),
    vessel("Measuring cylinder", 100, 0.5, true, { icon: "🧪", bench: { kind: "measuring-cylinder", props: { vol: 64, liquid: "#BFDBFE" } } }),
    D("Bunsen burner", { e: "heater", power: 1500 }, { icon: "🔥", safety: "Light it with the air hole closed; use the blue flame to heat; never leave a lit burner.", bench: { kind: "bunsen", props: { on: true } } }),
    tool("Tripod stand", "Holds a beaker or gauze above a Bunsen burner.", { bench: { kind: "tripod" } }),
    tool("Wire gauze", "Spreads the heat of the flame evenly under a beaker."),
    tool("Heat-resistant mat", "Protects the bench from heat."),
    vessel("Crucible", 20, 5, false, { heat: true, about: "A small porcelain pot for heating solids strongly." }),
    tool("Crucible tongs", "For lifting a hot crucible.", { safety: "Everything that has been heated looks the same as when it's cold — use tongs." }),
    tool("Insulating flask", "A vacuum flask: the vacuum stops conduction and convection, silvering reduces radiation."),
    tool("Metal rods", "Rods of different metals to compare conduction (wax drops fall first from the best conductor)."),
    tool("Expansion apparatus", "Measures how much a rod expands when heated: ΔL = αLΔθ."),
    tool("Ball-and-ring apparatus", "A ball that passes through a ring cold but not when heated: solids expand."),
    tool("Bar and gauge apparatus", "A bar that fits its gauge only when cold."),
    tool("Conduction apparatus", "Compares how well different materials conduct heat."),
    tool("Convection apparatus", "Shows convection currents with a crystal of potassium manganate(VII) in water."),
    tool("Radiation apparatus", "Compares how dull black and shiny surfaces emit and absorb radiation."),
    D("Steam generator", { e: "heater", power: 2000 }, { about: "Makes steam for latent heat and expansion experiments.", safety: "Steam scalds — keep hands clear of the outlet." }),
    D("Cooling curve apparatus", { e: "heater", power: 0 }, { about: "Record the temperature of a cooling substance every minute: the flat part is where it freezes." }),
    D("Latent heat apparatus", { e: "heater", power: 50 }, { about: "An immersion heater and joulemeter melt ice or boil water: L = E ÷ m." }),
    D("Specific heat capacity apparatus", { e: "heater", power: 50 }, { about: "Heat a 1 kg block with a 50 W heater: c = E ÷ (mΔθ).", bench: { kind: "metal-block", props: { thermo: true, T: 32 } } }),
    D("Water bath", { e: "heater", power: 800 }, { bench: { kind: "water-bath", props: { T: 40 } } }),
    tool("Heat transfer apparatus", "Demonstrates conduction, convection and radiation together."),
    tool("Leslie cube", "A hollow cube with four different faces: matt black radiates most, shiny silver least."),
    scale("Thermocouple", -200, 1200, 1, "°C", "temperature (two different metals give a p.d.)"),
    scale("Temperature sensor", -40, 125, 0.1, "°C", "temperature, logged over time"),
  ],
  "Waves and sound": [
    D("Tuning forks", { e: "wave", part: "fork", f: 256 }, { icon: "🎵", bench: { kind: "fork-set", props: { freqs: [256, 288, 320, 384, 512], current: 0 } } }),
    D("Resonance tube", { e: "wave", part: "tube", f: 512 }, { about: "A tube in water: lift it until the air column booms — first resonance at λ/4 (less the end correction)." }),
    D("Resonance box", { e: "wave", part: "tube", f: 256 }), D("Ripple tank", { e: "wave", part: "ripple", f: 8 }, { bench: { kind: "ripple-tank", props: { on: true, lambda: 2 } } }),
    D("Ripple generator", { e: "wave", part: "ripple", f: 10 }), D("Wave tray", { e: "wave", part: "ripple", f: 5 }),
    D("Sonometer", { e: "wave", part: "string", f: 256 }, { bench: { kind: "sonometer", props: { L: 30, m: 1 } } }),
    D("String vibrator", { e: "wave", part: "string", f: 50 }), same("Signal generator"),
    D("Loudspeaker", { e: "wave", part: "speaker", f: 440 }, { icon: "🔊" }), D("Microphone", { e: "wave", part: "mic", f: 440 }, { icon: "🎤" }),
    scale("Sound level meter", 30, 130, 1, "dB", "loudness"), same("Oscilloscope"),
    D("Wave spring (Slinky)", { e: "wave", part: "slinky", f: 2 }, { about: "Push and pull for longitudinal waves, shake sideways for transverse ones." }),
    D("Wave demonstrator", { e: "wave", part: "slinky", f: 1 }), D("Water wave generator", { e: "wave", part: "ripple", f: 6 }),
    D("Resonance apparatus", { e: "wave", part: "tube", f: 384 }), D("Sound frequency generator", { e: "wave", part: "signal", f: 1000 }),
    D("Echo demonstration apparatus", { e: "wave", part: "speaker", f: 500 }, { about: "Clap and time the echo from a wall: v = 2d ÷ t." }),
    D("Acoustic tube", { e: "wave", part: "tube", f: 440 }),
  ],
  "Magnetism and electromagnetism": [
    D("Bar magnet", { e: "magnet", strength: 10 }, { icon: "🧲" }), D("Horseshoe magnet", { e: "magnet", strength: 14 }, { icon: "🧲" }),
    tool("Magnetic compass", "A small magnet that points along the field lines (north end towards a south pole).", { icon: "🧭" }),
    tool("Iron filings", "Sprinkled on paper over a magnet, they show the field pattern."),
    D("Magnetic field plotting board", { e: "magnet", strength: 10 }), tool("Soft iron core", "Becomes magnetised easily and loses it quickly: used in electromagnets and transformers."),
    same("Electromagnet"), D("Solenoid", { e: "magnet", strength: 6 }, { about: "A long coil: inside, the field is strong and uniform, like a bar magnet's." }),
    tool("Coil of wire", "Moving a magnet in or out induces a current (Faraday's law)."),
    tool("Magnetic needle", "A pivoted magnet for detecting fields."), same("Horseshoe magnet"),
    tool("Magnetic materials samples", "Iron, steel, nickel and cobalt are magnetic; copper, aluminium and wood are not."),
    tool("Electromagnetic induction apparatus", "A magnet, coil and galvanometer: the faster the change, the bigger the induced current."),
    same("Galvanometer"), D("Magnetic field detector", { e: "magnet", strength: 1 }), tool("Compass box", "A set of plotting compasses."),
    tool("Transformer core", "Laminated soft iron so the field links both coils with little energy loss."),
    tool("Magnetic stirrer", "A spinning magnet under the beaker turns a stirrer bar inside it."),
  ],
  "Modern physics and radioactivity": [
    D("Geiger-Müller counter", { e: "radiation", kind: "detector" }, { icon: "☢️" }), tool("Cloud chamber", "Shows the tracks of ionising radiation: alpha thick and short, beta thin and wavy."),
    D("Radiation detector", { e: "radiation", kind: "detector" }),
    D("Alpha radiation simulation source", { e: "radiation", kind: "alpha" }, { icon: "☢️", safety: "Real sources: handle with tongs, hold away from the body, never point at anyone." }),
    D("Beta radiation simulation source", { e: "radiation", kind: "beta" }, { icon: "☢️", safety: "Handle with tongs; keep at arm's length." }),
    D("Gamma radiation simulation source", { e: "radiation", kind: "gamma" }, { icon: "☢️", safety: "Handle with tongs; keep at arm's length." }),
    tool("Photoelectric effect apparatus", "Light above a threshold frequency frees electrons from a metal, however dim."),
    tool("Cathode ray tube", "A beam of electrons from a hot cathode, deflected by electric and magnetic fields."),
    tool("Electron beam tube", "Shows that electron beams travel in straight lines and are bent by magnets."),
    tool("Millikan oil-drop apparatus", "Balances charged oil drops in an electric field: charge comes in multiples of 1.6 × 10⁻¹⁹ C."),
    tool("Spectral tubes", "Gas discharge tubes: each element gives its own line spectrum."), tool("Hydrogen discharge tube", "Glows with hydrogen's red, blue-green and violet lines."),
    model("Atomic model apparatus", [["Nucleus", "Holds protons and neutrons: nearly all the mass"], ["Proton", "Positive charge; the number of them is the atomic number"], ["Neutron", "No charge; protons + neutrons = mass number"], ["Electron", "Negative charge, in shells around the nucleus"]]),
    same("Diffraction grating"), tool("X-ray tube simulator", "Fast electrons hitting a metal target give X-rays."),
    tool("Nuclear fission simulator", "A neutron splits uranium-235, releasing energy and more neutrons — a chain reaction."),
    tool("Nuclear fusion simulator", "Light nuclei join (as in the Sun), releasing energy."),
    D("Half-life simulation apparatus", { e: "radiation", kind: "halflife", half: 5 }, { about: "Throw dice and remove those showing six: the number left halves every few throws, like radioactive decay." }),
  ],
  "Safety equipment": [same("Safety goggles"), same("Laboratory coat"), same("Fire extinguisher"), same("Fire blanket"), same("First aid kit"), same("Heatproof mat")
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// CHEMISTRY
const acid = (name: string, formula: string, pH: number, anion: string, hz: Hazard[] = ["corrosive"]) => reagent(name, formula, "acid", pH, hz, { cation: "H+", anion }, { icon: "🧴" });
const alkali = (name: string, formula: string, pH: number, cation: string, hz: Hazard[] = ["corrosive"]) => reagent(name, formula, "alkali", pH, hz, { cation, anion: "OH-" }, { icon: "🧴" });
const salt = (name: string, formula: string, cation: string, anion: string, hz: Hazard[] = [], pH = 7) => reagent(name, formula, "salt", pH, hz, { cation, anion }, { icon: "🧂" });
const gasR = (name: string, formula: string, pH: number, hz: Hazard[]) => reagent(name, formula, "gas", pH, hz, { gas: formula }, { icon: "💨" });
const CHEMISTRY: Record<string, Def[]> = {
  "General glassware": [
    vessel("Beaker (50 ml)", 50, 2.5, false, { heat: true, icon: "🥛" }), vessel("Beaker (100 ml)", 100, 5, false, { heat: true, icon: "🥛" }), same("Beaker"),
    vessel("Beaker (500 ml)", 500, 25, false, { heat: true, icon: "🥛" }), vessel("Beaker (1000 ml)", 1000, 50, false, { heat: true, icon: "🥛" }),
    vessel("Conical flask", 250, 12.5, false, { heat: true, icon: "⚗️", about: "Its narrow neck stops splashing when you swirl it — used for titrations.", bench: { kind: "flask", props: { colour: "#FBCFE8", vol: 50 } } }),
    vessel("Volumetric flask", 250, 0.15, true, { about: "Makes up a solution to one exact volume (fill to the line on the neck)." }),
    vessel("Round-bottom flask", 250, 12.5, false, { heat: true, about: "Heats evenly — for distillation and refluxing (needs a stand)." }),
    vessel("Flat-bottom flask", 250, 12.5, false, { heat: true }), vessel("Florence flask", 500, 25, false, { heat: true }),
    same("Measuring cylinder"),
    vessel("Test tube", 15, 1, false, { heat: true, icon: "🧪", about: "For small-scale reactions and tests." }), vessel("Boiling tube", 35, 2, false, { heat: true, icon: "🧪", about: "Wider than a test tube: for heating liquids." }),
    tool("Test tube rack", "Holds test tubes upright.", { bench: { kind: "rack", props: { tubes: [{ colour: "#BFDBFE" }, { colour: "#FDE68A" }, { colour: "#FBCFE8" }] } } }),
    tool("Test tube holder", "Grips a test tube while you heat it.", { safety: "Point the mouth of the tube away from everyone." }),
    tool("Watch glass", "A shallow glass dish for evaporating small amounts or covering a beaker."),
    tool("Glass stirring rod", "For stirring and for touching a drop onto indicator paper."),
    tool("Reagent bottle", "Stores a solution; label it with name, concentration and hazards.", { bench: { kind: "bottle", props: { label: "HCl" } } }),
    tool("Dropper bottle", "Adds indicator or a reagent drop by drop.", { bench: { kind: "dropper" } }),
    tool("Glass funnel", "For pouring into narrow necks and, with filter paper, for filtering.", { bench: { kind: "filter" } }),
    tool("Separating funnel", "Separates two liquids that don't mix: run off the lower layer through the tap."),
    tool("Thistle funnel", "Adds liquid to a gas-preparation flask through the stopper."),
    tool("Buchner funnel", "Fast filtration under reduced pressure."), tool("Filter flask", "A thick-walled flask with a side arm for vacuum filtration."),
    tool("Glass tubing", "Joins apparatus and carries gases."), tool("Delivery tube", "Carries a gas from a flask to where it's collected."),
    vessel("Gas jar", 500, 25, false, { about: "Collects and stores a gas, covered with a greased lid." }),
    scale("Gas syringe", 0, 100, 1, "cm³", "volume of gas given off", { bench: { kind: "gas-syringe", props: { vol: 38 } } }),
    tool("Desiccator", "A sealed container with a drying agent: keeps solids dry as they cool."),
    vessel("Evaporating dish", 60, 5, false, { heat: true, about: "For evaporating a solution to leave the solid." }),
    vessel("Crystallising dish", 150, 10, false), vessel("Petri dish", 30, 3, false, { bench: { kind: "dish" } }),
    tool("Mortar and pestle", "Grinds solids (and leaves) into a powder or paste."),
    tool("Wash bottle", "Squirts distilled water for rinsing and making up to the mark."),
    tool("Condenser", "Cools vapour back to liquid; water goes in at the bottom and out at the top."),
    vessel("Boiling flask", 250, 12.5, false, { heat: true }), tool("Dropping funnel", "Adds a liquid slowly to a reaction, with a tap."),
    scale("Measuring pipette", 0, 10, 0.1, "cm³", "volumes it delivers"),
    vessel("Volumetric pipette", 25, 0.06, true, { about: "Delivers one exact volume (25.0 cm³) — fill to the line with a pipette filler.", bench: { kind: "pipette" } }),
    scale("Burette", 0, 50, 0.1, "cm³", "volume added (numbers go down the tube)", { icon: "🧪", bench: { kind: "stand", props: { level: 23.4, liquid: "#BFDBFE" } } }),
    tool("Reagent trough", "A trough of water for collecting gas over water."), tool("Capillary tube", "A very fine tube: spots for chromatography, melting points."),
    tool("Glass rod", "For stirring and transferring a drop."), tool("Rubber stopper", "Seals a flask or tube."), tool("Cork stopper", "Seals a tube; it can be bored."),
    tool("One-holed stopper", "Takes one delivery tube or thermometer."), tool("Two-holed stopper", "Takes a thistle funnel and a delivery tube."),
    tool("Delivery tube connector", "Rubber tubing that joins glass tubes."), vessel("Gas collection bottle", 250, 12.5, false),
  ],
  "Measuring and analysis": [
    scale("Digital weighing balance", 0, 600, 0.01, "g", "mass", { bench: { kind: "balance", props: { reading: 12.84 } } }), scale("Analytical balance", 0, 200, 0.0001, "g", "very small masses (in a draught shield)"),
    scale("Top-pan balance", 0, 2000, 0.1, "g", "mass"), same("Measuring cylinder"), same("Volumetric pipette"),
    scale("Graduated pipette", 0, 10, 0.1, "cm³", "volumes it delivers"), scale("Micropipette", 0, 1000, 1, "μl", "tiny volumes"),
    same("Burette"), tool("Burette stand", "Holds a burette vertical."), same("Retort stand"), same("Clamp"),
    scale("Thermometer", -10, 110, 1, "°C", "temperature", { bench: { kind: "thermo-beaker", props: { T: 24 } } }),
    scale("pH meter", 0, 14, 0.01, "pH", "acidity (calibrate in buffer first)", { bench: { kind: "ph-meter", props: { pH: 4.21 } } }),
    scale("Conductivity meter", 0, 2000, 1, "μS/cm", "how well a solution conducts (ions present)"),
    ind("Universal indicator", "universal", { icon: "🌈", bench: { kind: "ph-chart" } }), ind("Litmus paper", "litmus"), ind("pH paper", "universal"),
    same("Stopwatch"), scale("Hydrometer", 0.7, 1.3, 0.005, "g/cm³", "density of a liquid (it floats higher in denser liquids)"),
    vessel("Density bottle", 50, 0.05, true, { about: "Holds an exact volume: weigh it empty and full to find a liquid's density." }),
    scale("Colorimeter", 0, 100, 0.1, "% transmitted", "how much light a coloured solution lets through"),
    scale("Spectrophotometer", 0, 2, 0.001, "absorbance", "absorbance at one wavelength (concentration)"),
    scale("Melting point apparatus", 20, 300, 0.5, "°C", "melting points (pure substances melt sharply)"),
    scale("Refractometer", 1.3, 1.7, 0.0001, "", "refractive index"), same("Temperature sensor"),
    scale("Gas pressure sensor", 0, 400, 0.1, "kPa", "gas pressure"), same("Digital weighing balance"),
    tool("Titration apparatus", "Burette, pipette, conical flask, white tile and indicator: finds an unknown concentration.", { bench: { kind: "stand", props: { level: 18.6 } } }),
    tool("Centrifuge", "Spins tubes fast so solids collect at the bottom."), tool("Centrifuge tubes", "Tubes that go in the centrifuge — balance them in pairs."),
  ],
  "Heating equipment": [
    same("Bunsen burner"), D("Spirit lamp", { e: "heater", power: 500 }, { icon: "🕯️" }), same("Tripod stand"), same("Wire gauze"),
    tool("Heatproof mat", "Protects the bench under a Bunsen burner."), same("Crucible"), tool("Crucible lid", "Covers a crucible; lift it a little to let air in while heating magnesium."),
    same("Crucible tongs"), tool("Beaker tongs", "Lifts hot beakers safely."), same("Test tube holder"), same("Water bath"),
    D("Sand bath", { e: "heater", power: 600 }), D("Heating mantle", { e: "heater", power: 300 }, { about: "Heats round-bottom flasks evenly — safe with flammable liquids." }),
    D("Hot plate", { e: "heater", power: 1000 }), D("Electric furnace", { e: "heater", power: 3000 }), D("Drying oven", { e: "heater", power: 800 }),
    D("Thermostatic bath", { e: "heater", power: 800 }), D("Laboratory burner", { e: "heater", power: 1500 }), D("Ceramic heating plate", { e: "heater", power: 1200 }), same("Retort stand"),
  ],
  "Separation techniques": [
    tool("Filter funnel", "Holds filter paper: the residue stays on the paper, the filtrate runs through.", { bench: { kind: "filter" } }),
    tool("Filter paper", "Folded into a cone; its tiny holes let liquid through but not solid."),
    same("Separating funnel"), vessel("Distillation flask", 250, 12.5, false, { heat: true }),
    tool("Liebig condenser", "Cools the vapour so it condenses into the receiver."),
    tool("Fractionating column", "Packed with glass beads: separates liquids with close boiling points."),
    same("Thermometer"), vessel("Receiver flask", 250, 12.5, false), same("Evaporating dish"), same("Centrifuge"), same("Centrifuge tubes"),
    tool("Chromatography paper", "The spots move up with the solvent; Rf = distance by spot ÷ distance by solvent.", { bench: { kind: "chroma-paper" } }),
    tool("Chromatography tank", "Holds the solvent and paper with a lid, so the air inside is saturated."),
    tool("Capillary tubes", "Put tiny spots of ink or extract on chromatography paper."), same("Ruler (30 cm)"),
    tool("Rotary evaporator", "Removes solvent gently under reduced pressure."), same("Buchner funnel"), tool("Vacuum pump", "Lowers the pressure for vacuum filtration.", { bench: { kind: "pump" } }),
    tool("Decantation apparatus", "Pour off the liquid carefully, leaving the settled solid."),
    tool("Crystallisation apparatus", "Evaporate to the point of crystallisation, then let it cool slowly."),
    tool("Sublimation apparatus", "Heats a mixture so one solid (iodine, ammonium chloride) turns straight to vapour and collects on a cold surface."),
    tool("Fractional distillation apparatus", "Separates miscible liquids (ethanol and water, crude oil) by boiling point."),
    tool("Simple distillation apparatus", "Separates a solvent from a solution (pure water from salt water)."),
    tool("Filtration apparatus", "Funnel, filter paper and flask: separates an insoluble solid from a liquid."),
  ],
  "Gas preparation and collection": [
    tool("Gas generator", "A flask with a thistle or dropping funnel and a delivery tube.", { bench: { kind: "gas-flask" } }), same("Gas jar"), same("Delivery tube"),
    tool("Pneumatic trough", "A trough of water: collect insoluble gases by displacing water from a jar."), same("Gas syringe"),
    same("Thistle funnel"), same("Dropping funnel"), same("Rubber stopper"), same("Two-holed stopper"), same("One-holed stopper"),
    tool("Combustion tube", "A hard-glass tube for heating solids in a stream of gas."),
    tool("Drying tube", "Filled with anhydrous calcium chloride to dry a gas."), same("Gas collection bottle"),
    tool("Gas preparation flask", "Where the reagents react to make the gas."),
    tool("Gas washing bottle", "Bubbles a gas through a liquid (water, or concentrated sulfuric acid to dry it)."),
    tool("Woulfe's bottle", "A bottle with several necks for washing or absorbing gases."),
    tool("Gas collection apparatus", "Upward delivery (lighter gases), downward delivery (denser gases), over water (insoluble gases) or a gas syringe."),
    same("Gas pressure sensor"),
  ],
  "Electrochemistry": [
    same("DC power supply"), same("Connecting wires"), same("Ammeter"), same("Crocodile clips"), same("Switch"),
    tool("Carbon electrodes", "Inert graphite rods: the products come from the electrolyte, not the electrode.", { bench: { kind: "electrode" } }),
    tool("Copper electrodes", "Copper anodes dissolve as copper plates onto the cathode — used for purifying copper."),
    tool("Electrolysis cell", "A beaker or U-tube of electrolyte with two electrodes.", { bench: { kind: "electrolysis-cell" } }),
  ],
  "Acids": [
    acid("Hydrochloric acid", "HCl", 1, "Cl-"), acid("Sulfuric acid", "H2SO4", 0.8, "SO4 2-"), acid("Nitric acid", "HNO3", 1, "NO3-", ["corrosive", "oxidising"]),
    acid("Ethanoic acid", "CH3COOH", 2.9, "CH3COO-", ["irritant"]), acid("Carbonic acid", "H2CO3", 4.5, "HCO3-", []), acid("Phosphoric acid", "H3PO4", 1.6, "PO4 3-"),
    acid("Citric acid", "C6H8O7", 2.2, "citrate", ["irritant"]), acid("Oxalic acid", "H2C2O4", 1.3, "oxalate", ["harmful"]),
  ],
  "Bases and alkalis": [
    alkali("Sodium hydroxide", "NaOH", 14, "Na+"), alkali("Potassium hydroxide", "KOH", 14, "K+"), alkali("Calcium hydroxide", "Ca(OH)2", 12.4, "Ca2+", ["irritant"]),
    alkali("Aqueous ammonia", "NH3(aq)", 11.6, "NH4+", ["irritant"]), alkali("Magnesium hydroxide", "Mg(OH)2", 10.4, "Mg2+", []), alkali("Barium hydroxide", "Ba(OH)2", 13.5, "Ba2+", ["harmful", "corrosive"]),
  ],
  "Salts": [
    salt("Sodium chloride", "NaCl", "Na+", "Cl-"), salt("Copper(II) sulfate", "CuSO4", "Cu2+", "SO4 2-", ["harmful"], 4), salt("Zinc sulfate", "ZnSO4", "Zn2+", "SO4 2-", ["irritant"], 5),
    salt("Calcium carbonate", "CaCO3", "Ca2+", "CO3 2-", [], 9), salt("Sodium carbonate", "Na2CO3", "Na+", "CO3 2-", ["irritant"], 11.5), salt("Sodium hydrogen carbonate", "NaHCO3", "Na+", "HCO3-", [], 8.3),
    salt("Ammonium chloride", "NH4Cl", "NH4+", "Cl-", ["harmful"], 5), salt("Potassium nitrate", "KNO3", "K+", "NO3-", ["oxidising"]), salt("Silver nitrate", "AgNO3", "Ag+", "NO3-", ["corrosive", "oxidising"]),
    salt("Lead(II) nitrate", "Pb(NO3)2", "Pb2+", "NO3-", ["toxic", "oxidising"], 4), salt("Iron(II) sulfate", "FeSO4", "Fe2+", "SO4 2-", ["harmful"], 4), salt("Iron(III) chloride", "FeCl3", "Fe3+", "Cl-", ["corrosive"], 2),
    salt("Potassium chloride", "KCl", "K+", "Cl-"), salt("Magnesium sulfate", "MgSO4", "Mg2+", "SO4 2-"), salt("Sodium sulfate", "Na2SO4", "Na+", "SO4 2-"), salt("Calcium chloride", "CaCl2", "Ca2+", "Cl-", ["irritant"]),
  ],
  "Indicators": [
    ind("Methyl orange", "methyl-orange"), ind("Phenolphthalein", "phenolphthalein", { safety: "Phenolphthalein solution is in ethanol: highly flammable." }), ind("Litmus solution", "litmus"), same("Universal indicator"),
    ind("Bromothymol blue", "bromothymol"), ind("Starch solution", "starch"), ind("Methyl red", "methyl-red"), ind("Congo red", "congo-red"),
  ],
  "Other substances": [
    reagent("Distilled water", "H2O", "other", 7, [], {}, { icon: "💧" }), reagent("Ethanol", "C2H5OH", "organic", 7, ["flammable"], {}, { icon: "🍶" }),
    reagent("Glucose", "C6H12O6", "organic", 7, []), reagent("Sucrose", "C12H22O11", "organic", 7, []), reagent("Iodine solution", "I2/KI", "other", 6, ["harmful"]),
    reagent("Limewater", "Ca(OH)2(aq)", "alkali", 12.4, ["irritant"], { cation: "Ca2+", anion: "OH-" }), reagent("Hydrogen peroxide", "H2O2", "other", 6, ["oxidising", "irritant"], { gas: "O2" }),
    reagent("Sodium thiosulfate", "Na2S2O3", "salt", 7, [], { cation: "Na+", anion: "S2O3 2-" }), reagent("Magnesium ribbon", "Mg", "metal", 7, ["flammable"], { cation: "Mg2+" }),
    reagent("Zinc granules", "Zn", "metal", 7, [], { cation: "Zn2+" }), reagent("Iron filings", "Fe", "metal", 7, [], { cation: "Fe2+" }), reagent("Copper turnings", "Cu", "metal", 7, [], { cation: "Cu2+" }),
    reagent("Sulfur powder", "S", "other", 7, ["flammable"]), reagent("Calcium oxide", "CaO", "alkali", 12.5, ["corrosive"], { cation: "Ca2+" }), reagent("Activated charcoal", "C", "other", 7, []),
    reagent("Sodium metal", "Na", "metal", 14, ["flammable", "corrosive"], { cation: "Na+" }, { safety: "Stored under oil; reacts violently with water — teacher demonstration only, behind a safety screen." }),
    reagent("Potassium permanganate", "KMnO4", "salt", 7, ["oxidising", "harmful"], { cation: "K+", anion: "MnO4-" }), reagent("Potassium dichromate", "K2Cr2O7", "salt", 4, ["toxic", "oxidising"], { cation: "K+", anion: "Cr2O7 2-" }),
    reagent("Bromine water", "Br2(aq)", "other", 3, ["toxic", "corrosive"]), reagent("Chlorine water", "Cl2(aq)", "other", 3, ["toxic", "oxidising"], { gas: "Cl2" }),
    reagent("Ammonium hydroxide", "NH4OH", "alkali", 11.6, ["irritant"], { cation: "NH4+", anion: "OH-", gas: "NH3" }),
    gasR("Methane", "CH4", 7, ["flammable"]), gasR("Ethene", "C2H4", 7, ["flammable"]), gasR("Ethyne", "C2H2", 7, ["flammable", "explosive"]), gasR("Carbon dioxide", "CO2", 5.6, []),
    gasR("Oxygen", "O2", 7, ["oxidising"]), gasR("Hydrogen", "H2", 7, ["flammable", "explosive"]), gasR("Nitrogen", "N2", 7, []), gasR("Chlorine", "Cl2", 3, ["toxic", "oxidising"]), gasR("Ammonia gas", "NH3", 11, ["toxic", "corrosive"]),
  ],
  "Safety equipment": [
    safe("Laboratory coat", ["corrosive", "irritant", "biological"], "Protects your skin and clothes from splashes.", { icon: "🥼" }),
    safe("Safety goggles", ["corrosive", "irritant", "glass", "hot"], "Wear them whenever chemicals are used or anything is heated.", { icon: "🥽" }),
    safe("Chemical-resistant gloves", ["corrosive", "toxic", "irritant", "biological"], "For handling corrosive or toxic substances.", { icon: "🧤" }),
    safe("Face shield", ["corrosive", "explosive", "hot"], "Full-face protection for reactions that may splash or explode."),
    safe("Fire extinguisher", ["flammable"], "CO₂ for electrical and liquid fires; never water on burning oil or electrics.", { icon: "🧯" }),
    safe("Fire blanket", ["flammable"], "Smothers a small fire or wraps a person whose clothes are on fire."),
    safe("First aid kit", ["sharp", "hot"], "For minor cuts and burns (cool burns under running water for 10 minutes).", { icon: "⛑️" }),
    safe("Fume cupboard", ["toxic", "flammable"], "Use for toxic or smelly gases (chlorine, bromine, ammonia) — it draws them away."),
    safe("Eye wash station", ["corrosive", "irritant"], "Rinse an eye with running water for at least 10 minutes."),
    safe("Safety shower", ["corrosive"], "For large chemical spills on a person."), safe("Chemical spill kit", ["corrosive", "toxic"], "Neutralises and absorbs spills."),
    safe("Biohazard waste bin", ["biological"], "For cultures and anything that has touched them (autoclaved first)."), safe("Chemical waste container", ["toxic", "oxidising"], "Heavy metals and organic solvents never go down the sink."),
    safe("Broken glass disposal container", ["glass", "sharp"], "Sweep up broken glass with a brush — never your hands."),
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// BIOLOGY
const plant = (name: string, group: string, habitat: string, f: string[]) => spec(name, group, habitat, f, { icon: "🌿" });
const animal = (name: string, group: string, habitat: string, f: string[]) => spec(name, group, habitat, f, { icon: "🐾" });
const organ = (name: string, parts: [string, string][]) => model(name, parts, { icon: "🫀" });
const BIOLOGY: Record<string, Def[]> = {
  "Microscopy": [
    D("Compound light microscope", { e: "microscope", eyepiece: 10, objectives: [4, 10, 40] }, { icon: "🔬", bench: { kind: "microscope", props: { focus: 50 } } }),
    D("Dissecting microscope", { e: "microscope", eyepiece: 10, objectives: [1, 2, 4] }, { icon: "🔬" }), D("Digital microscope", { e: "microscope", eyepiece: 10, objectives: [4, 10, 40, 100] }, { icon: "🔬" }),
    tool("Microscope slides", "Thin glass on which a specimen is mounted.", { bench: { kind: "slide" } }), tool("Cover slips", "Lowered at an angle with a needle so no air bubbles are trapped.", { bench: { kind: "coverslip" } }),
    tool("Prepared slides", "Permanent stained sections (root tip mitosis, blood, leaf)."), tool("Slide holder", "Keeps slides safe and in order."),
    tool("Lens tissue", "Cleans lenses without scratching them."), tool("Immersion oil", "Used with the ×100 oil-immersion objective."),
    D("Hand lens", { e: "microscope", eyepiece: 10, objectives: [1] }, { icon: "🔎", about: "About ×10: bring it close to your eye, then move the specimen until it's sharp." }), D("Magnifying glass", { e: "microscope", eyepiece: 3, objectives: [1] }, { icon: "🔎" }),
    scale("Eyepiece graticule", 0, 100, 1, "divisions", "lengths in the field of view (calibrate with a stage micrometer)"),
    scale("Stage micrometer", 0, 1, 0.01, "mm", "a known length to calibrate the graticule"), tool("Microscope illuminator", "The light under the stage."),
    tool("Microscope camera", "Takes pictures through the eyepiece."), tool("Slide staining rack", "Holds slides over a sink while staining."),
    tool("Dropping pipette", "Adds a drop of water or stain."), tool("Microscope slide box", "Stores slides."),
    tool("Microscope objective lenses", "×4, ×10 and ×40 — start with the lowest power."), tool("Microscope eyepieces", "Usually ×10; total magnification = eyepiece × objective."),
  ],
  "Dissection": [
    tool("Dissecting tray", "A wax-bottomed tray to pin the specimen out."), tool("Dissecting board", "A board to cut on."),
    tool("Scalpel", "A very sharp blade for fine cuts.", { safety: "Cut away from your fingers; carry it blade down; put it down flat.", icon: "🔪" }),
    tool("Dissecting scissors", "For cutting through skin and tissue."), tool("Forceps", "Hold and lift tissue.", { bench: { kind: "forceps" } }), tool("Dissecting needles", "Tease tissues apart."),
    tool("Blunt probe", "Separates organs without cutting them."), tool("Sharp probe", "Pierces and lifts fine structures."), tool("Dissecting pins", "Pin the specimen and the flaps of skin to the tray."),
    tool("Specimen jar", "Holds preserved specimens."), same("Chemical-resistant gloves"), same("Safety goggles"), tool("Laboratory apron", "Protects your clothes."),
    tool("Tweezers", "Pick up small things."), tool("Tissue holder", "Holds a tissue for cutting thin sections."), tool("Dissecting knife", "For larger cuts."),
    tool("Specimen preservation container", "Formalin or ethanol to preserve specimens."), same("Dissecting microscope"),
  ],
  "Plant specimens": [
    plant("Hibiscus flower", "Angiosperm (dicot)", "Gardens", ["Five large petals", "Long staminal column round the style", "Five-lobed stigma", "Epicalyx below the calyx"]),
    plant("Maize plant", "Angiosperm (monocot)", "Farms", ["Parallel leaf veins", "Fibrous roots", "Male tassel, female cob", "Wind pollinated"]),
    plant("Bean plant", "Angiosperm (dicot)", "Farms", ["Net-veined leaves", "Tap root with nodules (nitrogen fixation)", "Two cotyledons", "Epigeal germination"]),
    plant("Onion bulb", "Angiosperm (monocot)", "Farms", ["Swollen leaf bases store food", "Short stem (disc)", "Adventitious roots", "Organ of perennation"]),
    plant("Potato tuber", "Angiosperm (dicot)", "Farms", ["Swollen stem tip", "Eyes are buds", "Stores starch", "Vegetative propagation"], ),
    plant("Cassava root", "Angiosperm (dicot)", "Farms", ["Swollen root tuber", "Stores starch", "Contains cyanogenic glycosides (must be processed)"]),
    plant("Leaf specimens", "Plant organ", "Everywhere", ["Lamina, petiole and midrib", "Veins carry water and food", "Stomata mostly underneath"], ),
    plant("Stem specimens", "Plant organ", "Everywhere", ["Nodes and internodes", "Buds in the axils of leaves", "Vascular bundles in a ring (dicots)"]),
    plant("Root specimens", "Plant organ", "Soil", ["Root cap", "Root hairs take in water", "No leaves or buds"]),
    plant("Grass", "Angiosperm (monocot)", "Fields", ["Long narrow leaves with parallel veins", "Fibrous roots", "Wind-pollinated flowers"]),
    plant("Moss", "Bryophyte", "Damp shade", ["No true roots — rhizoids", "No vascular tissue", "Spores in a capsule"]),
    plant("Fern", "Pteridophyte", "Damp shade", ["Fronds uncoil from a crozier", "Spores in sori under the leaves", "Has vascular tissue"]),
    plant("Pine cone", "Gymnosperm", "Highlands", ["Naked seeds on scales", "Needle leaves", "Wind pollinated"]),
    plant("Seeds", "Plant structure", "—", ["Testa (seed coat)", "Embryo: plumule and radicle", "Cotyledons store food", "Micropyle lets water in"]),
    plant("Fruits", "Plant structure", "—", ["Develops from the ovary", "Two scars: style and stalk", "Dispersal by animals, wind, water or explosion"]),
    plant("Algae", "Protoctist", "Water", ["Photosynthetic", "No roots, stems or leaves", "Single-celled or filaments"]),
    plant("Mango leaf", "Angiosperm (dicot)", "Gardens", ["Simple leaf, entire margin", "Net venation", "Lanceolate shape"]),
    plant("Hibiscus leaf", "Angiosperm (dicot)", "Gardens", ["Toothed margin", "Net venation", "Alternate arrangement"]),
    plant("Bougainvillea", "Angiosperm (dicot)", "Gardens", ["Coloured bracts around small flowers", "Thorny climbing stem"]),
    plant("Mushroom", "Fungus", "Damp soil, wood", ["No chlorophyll — feeds saprophytically", "Cap, gills, stalk", "Spores from the gills"]),
    plant("Spirogyra", "Green alga", "Ponds", ["Unbranched filament", "Spiral chloroplasts", "Conjugation"]),
    plant("Rhizopus", "Fungus (bread mould)", "Damp bread", ["Hyphae form a mycelium", "Sporangia on stalks", "Saprophytic nutrition"]),
    plant("Lichen", "Fungus + alga", "Tree bark, rocks", ["A partnership (symbiosis)", "Sensitive to air pollution — an indicator species"]),
    plant("Liverwort", "Bryophyte", "Damp places", ["Flat thallus", "Rhizoids", "Gemma cups"]),
    plant("Water lily", "Angiosperm (hydrophyte)", "Ponds", ["Stomata on the upper surface", "Air spaces for buoyancy", "Long flexible petioles"]),
  ],
  "Animal specimens": [
    animal("Earthworm", "Annelid", "Moist soil", ["Segmented body", "Clitellum", "Chaetae for gripping", "Breathes through moist skin"]),
    animal("Cockroach", "Insect", "Houses", ["Three body parts", "Six jointed legs", "Two pairs of wings", "Incomplete metamorphosis"]),
    animal("Grasshopper", "Insect", "Grassland", ["Large hind legs for jumping", "Biting mouthparts", "Tympanum (ear) on the abdomen"]),
    animal("Butterfly", "Insect", "Gardens", ["Scaly wings", "Proboscis", "Complete metamorphosis"]),
    animal("Housefly", "Insect", "Houses", ["One pair of wings", "Sponging mouthparts", "Spreads typhoid and cholera"]),
    animal("Mosquito", "Insect", "Near water", ["Piercing mouthparts", "Anopheles carries malaria", "Larvae in water"]),
    animal("Snail", "Mollusc", "Damp places", ["Soft body in a coiled shell", "Muscular foot", "Two pairs of tentacles"]),
    animal("Fish", "Bony fish (vertebrate)", "Water", ["Gills and operculum", "Fins", "Scales", "Lateral line"]),
    animal("Frog", "Amphibian", "Water and land", ["Moist skin", "Webbed hind feet", "Tadpole metamorphosis"]),
    animal("Lizard", "Reptile", "Walls, trees", ["Dry scaly skin", "Lays leathery eggs", "Cold-blooded"]),
    animal("Pigeon", "Bird", "Towns", ["Feathers", "Beak", "Hollow bones", "Warm-blooded"]),
    animal("Rat", "Mammal", "Everywhere", ["Hair", "Gnawing incisors", "Mammary glands"]),
    animal("Rabbit", "Mammal", "Farms", ["Long ears", "Herbivore teeth with a diastema", "Mammary glands"]),
    animal("Crayfish", "Crustacean", "Fresh water", ["Two body parts", "Five pairs of legs", "Exoskeleton"]),
    animal("Spider", "Arachnid", "Everywhere", ["Two body parts", "Eight legs", "Spinnerets"]),
    animal("Millipede", "Myriapod", "Leaf litter", ["Two pairs of legs per segment", "Herbivore", "Rolls up"]),
    animal("Centipede", "Myriapod", "Leaf litter", ["One pair of legs per segment", "Poison claws", "Carnivore"]),
    animal("Scorpion", "Arachnid", "Dry places", ["Pincers", "Sting on the tail", "Eight legs"]),
    animal("Tapeworm", "Flatworm (parasite)", "Gut of a host", ["Scolex with hooks", "Flat segments (proglottids)", "No gut"]),
    animal("Roundworm", "Nematode", "Gut, soil", ["Unsegmented round body", "Pointed ends"]),
    animal("Leech", "Annelid", "Fresh water", ["Two suckers", "Feeds on blood", "Anticoagulant (hirudin)"]),
    animal("Starfish", "Echinoderm", "Sea", ["Five arms", "Tube feet", "Spiny skin"]),
    animal("Sea urchin", "Echinoderm", "Sea", ["Round spiny shell", "Tube feet"]),
    animal("Jellyfish", "Cnidarian", "Sea", ["Bell-shaped body", "Stinging tentacles", "One opening"]),
    animal("Hydra", "Cnidarian", "Ponds", ["Tentacles with stinging cells", "Buds asexually"]),
    animal("Planaria", "Flatworm", "Streams", ["Flat body", "Eye spots", "Regenerates"]),
    animal("Crab", "Crustacean", "Sea shore", ["Pincers", "Hard carapace", "Ten legs"]), animal("Lobster", "Crustacean", "Sea", ["Large claws", "Exoskeleton", "Ten legs"]),
    animal("Termite", "Insect", "Mounds", ["Social castes", "Digests wood with gut microbes"]), animal("Dragonfly", "Insect", "Near ponds", ["Two pairs of equal wings", "Large compound eyes", "Aquatic nymph"]),
    same("Centipede"), animal("Octopus", "Mollusc", "Sea", ["Eight arms with suckers", "No shell", "Ink sac"]),
    animal("Oyster", "Mollusc (bivalve)", "Sea", ["Two hinged shells", "Filter feeder"]), animal("Snail shell", "Mollusc", "—", ["Coiled calcium carbonate shell", "Grows at the opening"]),
  ],
  "Human anatomy models": [
    organ("Human skeleton", [["Skull", "Protects the brain"], ["Rib cage", "Protects the heart and lungs; breathing"], ["Vertebral column", "Supports the body and protects the spinal cord"], ["Pelvis", "Supports the abdomen; attaches the legs"], ["Femur", "The longest bone: the thigh"]]),
    organ("Human skull", [["Cranium", "Encloses the brain"], ["Mandible", "The only movable bone: chewing"], ["Orbit", "Holds the eye"], ["Foramen magnum", "Where the spinal cord passes"]]),
    organ("Human brain", [["Cerebrum", "Thinking, memory, voluntary actions"], ["Cerebellum", "Balance and coordination"], ["Medulla", "Breathing and heartbeat"], ["Hypothalamus", "Body temperature and water balance"]]),
    organ("Human heart", [["Right atrium", "Receives deoxygenated blood from the body"], ["Left ventricle", "Pumps oxygenated blood to the body (thickest wall)"], ["Valves", "Stop blood flowing backwards"], ["Aorta", "Carries blood from the heart to the body"], ["Pulmonary artery", "Carries blood to the lungs"]]),
    organ("Human lungs", [["Trachea", "Windpipe held open by cartilage rings"], ["Bronchi", "Carry air into each lung"], ["Alveoli", "Gas exchange: thin, moist, large surface area"], ["Diaphragm", "Contracts and flattens to breathe in"]]),
    organ("Human digestive system", [["Mouth", "Chewing; amylase in saliva"], ["Stomach", "Protease (pepsin) and acid kill bacteria"], ["Small intestine", "Digestion completed; villi absorb food"], ["Large intestine", "Absorbs water"], ["Liver", "Makes bile, which emulsifies fats"]]),
    organ("Human respiratory system", [["Nose", "Warms, moistens and filters air"], ["Larynx", "Voice box"], ["Trachea", "Carries air to the bronchi"], ["Alveoli", "Gas exchange"]]),
    organ("Human circulatory system", [["Heart", "Pumps blood"], ["Arteries", "Thick walls; carry blood away from the heart at high pressure"], ["Veins", "Valves; carry blood back to the heart"], ["Capillaries", "One cell thick: exchange with the tissues"]]),
    organ("Human urinary system", [["Kidney", "Filters blood, reabsorbs useful substances, makes urine"], ["Ureter", "Carries urine to the bladder"], ["Bladder", "Stores urine"], ["Urethra", "Carries urine out"]]),
    organ("Human reproductive system", [["Ovary", "Makes eggs and oestrogen"], ["Uterus", "Where the fetus develops"], ["Testis", "Makes sperm and testosterone"], ["Oviduct", "Where fertilisation happens"]]),
    organ("Human eye", [["Cornea", "Bends (refracts) light most"], ["Iris", "Controls the size of the pupil"], ["Lens", "Fine focusing (accommodation)"], ["Retina", "Light-sensitive cells: rods and cones"], ["Optic nerve", "Carries impulses to the brain"]]),
    organ("Human ear", [["Ear drum", "Vibrates with sound"], ["Ossicles", "Three small bones amplify the vibrations"], ["Cochlea", "Turns vibrations into nerve impulses"], ["Semicircular canals", "Balance"]]),
    organ("Human skin model", [["Epidermis", "Outer protective layer"], ["Sweat gland", "Sweat cools the body"], ["Hair erector muscle", "Raises hairs to trap air"], ["Blood vessels", "Widen (vasodilation) to lose heat"]]),
    organ("Human kidney", [["Cortex", "Contains the glomeruli"], ["Medulla", "Loops of Henle; water reabsorbed"], ["Nephron", "The filtering unit"], ["Renal artery", "Brings blood to be filtered"]]),
    organ("Human liver", [["Hepatocytes", "Liver cells: store glycogen, break down toxins"], ["Gall bladder", "Stores bile"], ["Hepatic portal vein", "Brings blood from the gut"]]),
    organ("Human teeth", [["Incisors", "Cutting"], ["Canines", "Tearing"], ["Premolars", "Grinding"], ["Molars", "Grinding and crushing"], ["Enamel", "The hardest substance in the body"]]),
    organ("Human muscular system", [["Biceps", "Bends the arm (flexor)"], ["Triceps", "Straightens the arm (extensor)"], ["Tendons", "Attach muscle to bone"], ["Antagonistic pairs", "One contracts as the other relaxes"]]),
    organ("Human nervous system", [["Brain", "Coordinates responses"], ["Spinal cord", "Carries impulses; reflex arcs"], ["Sensory neurone", "From receptor to the CNS"], ["Motor neurone", "From the CNS to an effector"]]),
    organ("Human spinal cord", [["Grey matter", "Cell bodies and relay neurones"], ["White matter", "Axons carrying impulses up and down"], ["Dorsal root", "Sensory neurones enter"], ["Ventral root", "Motor neurones leave"]]),
    organ("Human blood cells model", [["Red blood cell", "Haemoglobin carries oxygen; no nucleus"], ["White blood cell", "Fights infection (phagocytes and lymphocytes)"], ["Platelets", "Help blood clot"], ["Plasma", "Carries dissolved food, CO₂ and hormones"]]),
    organ("Human pancreas", [["Islets of Langerhans", "Make insulin and glucagon"], ["Acinar cells", "Make digestive enzymes"], ["Pancreatic duct", "Carries juice to the duodenum"]]),
    organ("Human stomach", [["Muscular wall", "Churns food"], ["Gastric glands", "Pepsin and hydrochloric acid"], ["Sphincter", "Controls food leaving"]]),
    organ("Human intestines", [["Duodenum", "Bile and pancreatic juice added"], ["Ileum", "Villi absorb digested food"], ["Colon", "Water absorbed"], ["Rectum", "Stores faeces"]]),
    organ("Human tongue", [["Taste buds", "Detect sweet, sour, salty, bitter and umami"], ["Muscle", "Moves food when chewing and swallowing"]]),
    organ("Human nose", [["Nostrils", "Let air in"], ["Hairs and mucus", "Trap dust and germs"], ["Olfactory cells", "Smell"]]),
    organ("Human endocrine system", [["Pituitary", "The master gland"], ["Thyroid", "Thyroxine controls metabolism"], ["Adrenal glands", "Adrenaline: fight or flight"], ["Pancreas", "Insulin lowers blood glucose"]]),
    organ("Human lymphatic system", [["Lymph nodes", "Filter lymph; lymphocytes fight infection"], ["Lymph vessels", "Return tissue fluid to the blood"], ["Spleen", "Destroys old red cells"]]),
    organ("Human joints", [["Synovial fluid", "Lubricates the joint"], ["Cartilage", "Reduces friction and absorbs shock"], ["Ligaments", "Hold bone to bone"], ["Ball and socket", "Movement in all directions (hip, shoulder)"]]),
    organ("Human vertebral column", [["Cervical vertebrae", "The neck (7)"], ["Thoracic vertebrae", "Ribs attach (12)"], ["Lumbar vertebrae", "The largest: lower back (5)"], ["Intervertebral discs", "Cushion the vertebrae"]]),
    organ("Human hand and foot bones", [["Carpals", "Wrist"], ["Metacarpals", "Palm"], ["Phalanges", "Fingers and toes"], ["Tarsals", "Ankle"]]),
  ],
  "Plant biology equipment": [
    tool("Potometer", "Measures the rate of water uptake by a leafy shoot (the air bubble moves).", { bench: { kind: "potometer", props: { bubble: 40 } } }),
    tool("Ganong's potometer", "A potometer with a reservoir to reset the bubble."),
    tool("Photosynthesis apparatus", "Count the oxygen bubbles from pondweed at different light distances.", { bench: { kind: "pondweed" } }),
    tool("Hydrilla plant setup", "Pondweed in water under a funnel and test tube to collect oxygen."),
    tool("Leaf starch testing apparatus", "Boil, decolourise in hot ethanol, rinse, add iodine: blue-black where starch is.", { bench: { kind: "leaf", props: { stage: 3 } } }),
    ind("Cobalt chloride paper", "litmus", { about: "Blue when dry, pink when wet: shows water loss from leaf surfaces.", icon: "🟦" }),
    tool("Bell jar", "Covers a plant to make a closed space (needs a glass plate and vaseline seal)."), tool("Glass plate", "Under a bell jar."),
    tool("Plant growth chamber", "Controls light, temperature and humidity."), tool("Germination tray", "For germinating seeds on damp cotton wool."),
    tool("Seed germination apparatus", "Tests the conditions for germination: water, oxygen, suitable temperature."),
    tool("Soil testing kit", "Measures soil pH and nutrients."), same("Thermometer"), scale("Light meter", 0, 20000, 10, "lux", "light intensity"),
    scale("Moisture meter", 0, 100, 1, "%", "soil moisture"), same("Measuring cylinder"), same("Petri dish"),
    tool("Water culture apparatus", "Grows plants in nutrient solutions with one mineral missing to see its effect."),
    tool("Plant press", "Dries and flattens specimens."), tool("Secateurs", "Cuts stems cleanly (under water for a potometer)."),
    tool("Soil sampling equipment", "Collects soil cores at set depths."),
    model("Root hair model", [["Root hair", "Long and thin: large surface area for absorbing water and minerals"], ["Vacuole", "Water enters by osmosis"]]),
    model("Leaf structure model", [["Palisade mesophyll", "Most chloroplasts: most photosynthesis"], ["Spongy mesophyll", "Air spaces for gas exchange"], ["Stomata", "Let CO₂ in; guard cells open and close them"], ["Xylem", "Brings water"], ["Phloem", "Takes sugars away"]]),
    tool("Flower dissection kit", "Separates sepals, petals, stamens and carpels."), same("Potometer"),
  ],
  "Genetics and cell biology": [
    model("DNA model", [["Double helix", "Two strands wound round each other"], ["Base pairs", "A pairs with T, C with G"], ["Sugar-phosphate backbone", "Holds the bases"], ["Gene", "A section of DNA that codes for a protein"]]),
    model("Chromosome model", [["Chromatid", "One copy of the DNA"], ["Centromere", "Joins the two chromatids"], ["Genes", "Sit at loci along the chromosome"]]),
    model("Cell model", [["Nucleus", "Contains DNA; controls the cell"], ["Cytoplasm", "Where reactions happen"], ["Cell membrane", "Controls what enters and leaves"], ["Mitochondria", "Respiration"], ["Ribosomes", "Make proteins"]]),
    model("Plant cell model", [["Cell wall", "Cellulose: support"], ["Chloroplast", "Photosynthesis"], ["Large vacuole", "Cell sap; keeps the cell firm"], ["Nucleus", "Control"]]),
    model("Animal cell model", [["Nucleus", "Control"], ["Cell membrane", "Partially permeable"], ["Cytoplasm", "Reactions"], ["Mitochondria", "Respiration"]]),
    model("Mitosis model", [["Prophase", "Chromosomes become visible"], ["Metaphase", "Chromosomes line up in the middle"], ["Anaphase", "Chromatids pulled apart"], ["Telophase", "Two new nuclei form — identical to the parent"]]),
    model("Meiosis model", [["Meiosis I", "Pairs of chromosomes separate"], ["Meiosis II", "Chromatids separate"], ["Gametes", "Four cells, each with half the chromosomes, all different"]]),
    same("Prepared slides"), same("Centrifuge"), tool("Microcentrifuge tubes", "Small tubes for DNA work."), same("Micropipette"),
    tool("Gel electrophoresis apparatus", "DNA fragments move through gel towards the positive electrode — smaller ones go further."),
    tool("DNA extraction kit", "Detergent, salt and cold ethanol pull DNA out of fruit cells as white threads."), tool("Staining solutions", "Iodine for starch in cells, methylene blue for animal cells."),
    tool("Agarose gel tray", "Holds the gel for electrophoresis."), circuit("Electrophoresis power supply", "supply", 100),
    D("Genetic inheritance model", { e: "random", kind: "coin" }, { about: "Each parent passes on one allele of each pair at random: toss a coin for each.", icon: "🧬" }),
    D("Punnett square board", { e: "random", kind: "balls", sides: 4 }, { about: "Aa × Aa gives AA : Aa : aa in the ratio 1 : 2 : 1 — the 3 : 1 ratio of the dominant to the recessive trait.", icon: "🧬" }),
    tool("Gene mapping tool", "Places genes on a chromosome by how often they're inherited together."), tool("Chromosome analysis tool", "Arranges chromosomes into a karyotype (23 pairs in humans)."),
  ],
  "Microbiology": [
    same("Petri dish"), tool("Agar plates", "A jelly with nutrients on which bacteria grow into colonies.", { bench: { kind: "dish" } }),
    tool("Inoculating loop", "Spreads microbes onto agar; flame it red-hot before and after.", { bench: { kind: "loop" } }), tool("Inoculating needle", "Transfers microbes to a slope or stab culture."),
    same("Bunsen burner"), D("Autoclave", { e: "heater", power: 2000 }, { about: "Steam at 121 °C under pressure for 15 minutes kills all microbes and spores." }),
    D("Incubator", { e: "heater", power: 100 }, { about: "Keeps cultures warm — 25 °C in schools, so human pathogens don't grow." }),
    tool("Laminar flow cabinet", "Sterile air flows over the work so it isn't contaminated."), tool("Culture tubes", "Hold broth or agar slopes."), tool("Culture bottles", "Larger cultures."),
    tool("Colony counter", "Counts colonies on a plate (each started from one cell)."), tool("Sterile swabs", "Take samples from surfaces."), same("Forceps"),
    same("Compound light microscope"), same("Slide staining rack"), same("Centrifuge"), tool("Sterile pipettes", "Transfer measured volumes without contaminating them."),
    tool("Anaerobic jar", "Grows microbes without oxygen."), tool("Culture medium", "Nutrient broth or agar."), same("Microscope slides"),
    tool("Gram staining kit", "Crystal violet, iodine, alcohol, safranin: Gram-positive purple, Gram-negative pink."), tool("Microbial identification charts", "Identify microbes by shape and stain."),
  ],
  "Ecology": [
    tool("Quadrat", "A square frame (often 0.5 m × 0.5 m) placed at random to count organisms; population ≈ mean per quadrat × total area ÷ quadrat area.", { bench: { kind: "tally" } }),
    tool("Transect line", "A tape across a habitat: sample along it to see how organisms change from place to place."),
    tool("Sweep net", "Swept through long grass to catch insects."), tool("Pond net", "Collects animals from water."), tool("Pitfall trap", "A buried jar that catches crawling animals overnight."),
    same("Thermometer"), scale("Hygrometer", 0, 100, 1, "% humidity", "humidity"), same("Light meter"),
    scale("Anemometer", 0, 30, 0.1, "m/s", "wind speed"), scale("Rain gauge", 0, 200, 1, "mm", "rainfall"), tool("Wind vane", "Points to where the wind comes from."),
    scale("Soil pH meter", 3, 10, 0.1, "pH", "soil acidity"), tool("Soil sampling auger", "Takes soil from a set depth."),
    scale("Secchi disc", 0, 10, 0.1, "m", "how clear water is (the depth at which it disappears)"), same("Measuring tape"),
    tool("Specimen bottles", "Hold collected organisms."), tool("Collecting jars", "Hold larger specimens."), tool("Identification charts", "Keys for identifying organisms."),
    same("Moisture meter"), tool("Water testing kit", "Tests nitrate, phosphate and pH of water."), scale("Dissolved oxygen meter", 0, 20, 0.1, "mg/l", "oxygen in water"),
    scale("Thermometer probe", -20, 100, 0.1, "°C", "temperature of soil or water"), tool("Wildlife camera simulator", "Records animals without disturbing them."),
    D("Population sampling simulator", { e: "random", kind: "balls", sides: 3 }, { about: "Capture–recapture: population ≈ (first catch × second catch) ÷ number marked in the second catch.", icon: "🐞" }),
  ],
  "Food tests": [
    same("Test tube"), same("Test tube rack"), tool("Droppers", "Add reagents drop by drop.", { bench: { kind: "dropper" } }), same("Beaker"), same("Water bath"), same("Bunsen burner"),
    same("Mortar and pestle"), same("Filter funnel"), same("Filter paper"),
    reagent("Biuret reagent", "CuSO4 + NaOH", "alkali", 13, ["corrosive"], { cation: "Cu2+" }, { about: "Turns purple with protein (blue if none)." }),
    reagent("Benedict's solution", "Cu2+ (alkaline)", "alkali", 10, ["irritant"], { cation: "Cu2+" }, { about: "Heat with a reducing sugar: blue → green → yellow → orange → brick-red as more sugar is present." }),
    same("Iodine solution"), same("Ethanol"), reagent("Sudan III solution", "Sudan III", "organic", 7, ["flammable"], {}, { about: "Stains fats red: a red layer floats on top." }),
    reagent("DCPIP solution", "DCPIP", "other", 7, ["irritant"], {}, { about: "Blue dye decolourised by vitamin C." }), reagent("Glucose solution", "C6H12O6(aq)", "organic", 7, []),
    reagent("Starch solution", "(C6H10O5)n", "organic", 7, []), reagent("Protein solution", "albumen", "organic", 7, []),
    tool("Food samples", "Milk, bread, groundnut, egg white, yam — grind and mix with water before testing."),
    same("Measuring cylinder"), tool("Pipettes", "Measure and transfer small volumes."), same("Test tube holder"), same("Thermometer"),
  ],
  "Measuring and timing": [same("Stopwatch"), same("Digital weighing balance"), same("Metre rule"), same("Ruler (30 cm)"), same("Measuring tape"), same("Measuring cylinder"), same("Thermometer")],
  "Solutions and reagents": [same("Distilled water"), same("Sucrose"), same("Limewater"), same("Hydrogen peroxide"), same("Sodium chloride"), same("Sodium hydrogen carbonate"), same("Universal indicator")],
  "Safety equipment": [same("Laboratory coat"), same("Safety goggles"), same("Chemical-resistant gloves"), same("First aid kit"), same("Biohazard waste bin"), same("Fire blanket"), same("Eye wash station")],
};

// ════════════════════════════════════════════════════════════════════════════
// MATHEMATICS
const MATHS: Record<string, Def[]> = {
  "Basic instruments": [
    scale("Ruler (15 cm)", 0, 15, 0.1, "cm", "length"), scale("Ruler (30 cm)", 0, 30, 0.1, "cm", "length", { icon: "📏" }), scale("Ruler (50 cm)", 0, 50, 0.1, "cm", "length"),
    same("Metre rule"), scale("Protractor (180°)", 0, 180, 1, "°", "angles"), scale("Full-circle protractor (360°)", 0, 360, 1, "°", "angles and bearings"),
    D("Mathematical compass", { e: "shape", kind: "circle" }, { icon: "🧭", about: "Draws circles and arcs: the gap between the point and pencil is the radius." }),
    same("Mathematical compass"), tool("Pair of compasses", "Draws circles and arcs, and constructs bisectors and angles of 60°."),
    tool("Divider", "Steps off equal lengths and transfers distances from a map scale."),
    D("Set squares (30°–60° and 45°)", { e: "shape", kind: "right" }, { about: "Right-angled triangles for drawing perpendicular and parallel lines and angles of 30°, 45° and 60°." }),
    graph("French curve", "cubic"), graph("Flexible curve", "quadratic"), tool("Drawing board", "A flat board with a T-square edge."),
    graph("Graph paper", "line"), D("Isometric paper", { e: "solid", kind: "cuboid" }, { about: "Dots in triangles: for drawing 3D shapes." }), D("Dot paper", { e: "shape", kind: "rectangle" }), tool("Tracing paper", "Copy a shape to rotate or reflect it."),
    D("Scientific calculator", { e: "stats" }, { icon: "🧮", about: "Statistics mode: mean, standard deviation and more." }), graph("Graphical calculator", "quadratic"),
    tool("Abacus", "Beads on rods for place value: ones, tens, hundreds."), D("Slide rule", { e: "graph", fn: "exp" }, { about: "Two log scales slide past each other: adding logs multiplies numbers." }),
    same("Measuring tape"), scale("Digital angle measurer", 0, 360, 0.1, "°", "angles"), same("Vernier callipers"), same("Micrometer screw gauge"),
  ],
  "2D shapes": [
    shape("Square", "square"), shape("Rectangle", "rectangle"), shape("Triangle", "scalene"), shape("Equilateral triangle", "equilateral"), shape("Isosceles triangle", "isosceles"),
    shape("Scalene triangle", "scalene"), shape("Right-angled triangle", "right"), shape("Parallelogram", "parallelogram"), shape("Rhombus", "rhombus"), shape("Trapezium", "trapezium"),
    shape("Kite", "kite"), shape("Pentagon", "polygon", 5), shape("Hexagon", "polygon", 6), shape("Heptagon", "polygon", 7), shape("Octagon", "polygon", 8), shape("Decagon", "polygon", 10),
    shape("Circle", "circle"), shape("Semicircle", "semicircle"), shape("Sector", "sector"), shape("Segment", "segment"), shape("Quadrilateral", "rectangle"),
    shape("Irregular polygon", "polygon", 7), shape("Regular polygon", "polygon", 9),
  ],
  "3D solids": [
    solid("Cube", "cube"), solid("Cuboid", "cuboid"), solid("Sphere", "sphere"), solid("Hemisphere", "hemisphere"), solid("Cylinder", "cylinder"), solid("Cone", "cone"),
    solid("Pyramid", "square-pyramid"), solid("Triangular prism", "tri-prism"), solid("Rectangular prism", "cuboid"), solid("Square-based pyramid", "square-pyramid"),
    solid("Pentagonal prism", "prism-n", 5), solid("Hexagonal prism", "prism-n", 6), solid("Tetrahedron", "tetrahedron"), solid("Octahedron", "octahedron"),
    solid("Dodecahedron", "dodecahedron"), solid("Icosahedron", "icosahedron"), solid("Frustum of a cone", "frustum-cone"), solid("Frustum of a pyramid", "frustum-pyramid"),
    solid("Triangular pyramid", "tri-pyramid"), solid("Hollow cylinder", "hollow-cylinder"), solid("Composite solids", "hemisphere"),
  ],
  "Geometry tools": [
    shape("Geoboard", "rectangle"), tool("Geoboard rubber bands", "Stretch round the pegs to make shapes."), D("Tangram", { e: "shape", kind: "right" }, { about: "Seven pieces cut from a square — their areas add up to the square's." }),
    shape("Pattern blocks", "polygon", 6), shape("Polygon tiles", "polygon", 8), tool("Geometry construction kit", "Ruler, compasses and protractor for constructions."),
    D("Circle theorem demonstration tool", { e: "shape", kind: "sector" }, { about: "The angle at the centre is twice the angle at the circumference; angles in a semicircle are 90°." }),
    D("Angle relationship demonstrator", { e: "shape", kind: "triangle" }, { about: "Angles on a line add to 180°, round a point to 360°; alternate and corresponding angles are equal." }),
    tool("Locus construction tool", "Constructs loci: a fixed distance from a point (circle), equidistant from two points (perpendicular bisector)."),
    solid("3D nets", "cube"), tool("Reflection mirror", "A mirror on the mirror line shows the reflected shape."), shape("Rotational symmetry tool", "polygon", 6),
    same("Pair of compasses"), tool("Parallel line demonstrator", "Shows alternate (Z), corresponding (F) and co-interior (C) angles."),
    tool("Perpendicular line demonstrator", "Constructs a perpendicular from a point to a line."), tool("Angle bisector tool", "Construct the bisector with compasses: arcs from both arms."),
    tool("Perpendicular bisector tool", "Two equal arcs from each end of the line; join where they cross."), graph("Transformation grid", "line"),
  ],
  "Algebra": [
    tool("Algebra tiles", "x², x and unit tiles to model expanding and factorising."), tool("Positive integer tiles", "+1 tiles."), tool("Negative integer tiles", "−1 tiles: a + and a − make zero."),
    tool("Variable blocks (x, y, z)", "Blocks standing for unknowns."), tool("Constant tiles", "Unit tiles for the number term."),
    graph("Algebra balance scale", "line"), graph("Equation balance", "line"), graph("Number line", "line"), tool("Integer counters", "Red and yellow counters for negative and positive numbers."),
    tool("Fraction counters", "Counters split into fractions."), graph("Polynomial tiles", "quadratic"), graph("Factorisation blocks", "quadratic"),
    graph("Function machine", "line"), graph("Input-output machine", "line"), graph("Coordinate plane", "line"), graph("Cartesian graph board", "line"),
    graph("Linear equation graphing tool", "line"), graph("Quadratic graphing tool", "quadratic"), graph("Simultaneous equation visualiser", "line"), graph("Inequality number line", "line"),
    graph("Expansion visualiser", "quadratic"), graph("Factorisation visualiser", "quadratic"), graph("Algebra equation solver", "quadratic"),
  ],
  "Fractions, decimals and percentages": [
    shape("Fraction circles", "sector"), shape("Fraction bars", "rectangle"), shape("Fraction strips", "rectangle"), shape("Fraction walls", "rectangle"), shape("Fraction tiles", "rectangle"),
    shape("Decimal grids", "square"), shape("Percentage grids", "square"), shape("Hundred squares", "square"), tool("Place-value counters", "Counters worth 1, 10, 100 and 0.1."),
    solid("Base-ten blocks", "cube"), rand("Number cards", "cards"), graph("Decimal number line", "line"), graph("Fraction number line", "line"), graph("Percentage number line", "line"),
    tool("Ratio blocks", "Coloured blocks to share in a ratio."), tool("Ratio tables", "Equivalent ratios by multiplying both parts."), graph("Proportion balance", "line"),
    tool("Decimal place-value chart", "Tens, ones, tenths, hundredths."), shape("Fraction comparison board", "rectangle"), shape("Percentage comparison board", "square"),
  ],
  "Measurement": [
    same("Ruler (30 cm)"), same("Measuring tape"), same("Metre rule"), scale("Weighing scale", 0, 5000, 10, "g", "mass"), same("Digital weighing balance"),
    vessel("Measuring jug", 1000, 25, true), same("Measuring cylinder"), same("Stopwatch"), D("Clock", { e: "timer", lc: 1 }, { icon: "🕰️", bench: { kind: "clock" } }),
    same("Thermometer"), same("Protractor (180°)"), same("Vernier callipers"), same("Micrometer screw gauge"), shape("Area measurement grid", "rectangle"), solid("Volume measurement blocks", "cuboid"),
    shape("Perimeter measurement tool", "rectangle"), same("Digital angle measurer"), same("Measuring tape"), scale("Mass comparison balance", 0, 1000, 5, "g", "mass (by balancing)"), same("Measuring jug"),
  ],
  "Statistics": [
    rand("Six-sided dice", "dice", 6, { icon: "🎲", bench: { kind: "dice", props: { value: 5 } } }), rand("Four-sided dice", "dice", 4, { icon: "🎲" }), rand("Eight-sided dice", "dice", 8, { icon: "🎲" }), rand("Ten-sided dice", "dice", 10, { icon: "🎲" }),
    rand("Twelve-sided dice", "dice", 12, { icon: "🎲" }), rand("Twenty-sided dice", "dice", 20, { icon: "🎲" }), rand("Coins", "coin", 2, { icon: "🪙" }), rand("Spinners", "spinner", 5, { icon: "🎡" }),
    rand("Random number generator", "rng", 10), rand("Coloured counters", "balls", 4), rand("Probability balls", "balls", 3), statTool("Frequency table board"), D("Tally counter", { e: "random", kind: "dice", sides: 6 }, { bench: { kind: "tally-chart" } }),
    statTool("Graph board"), statTool("Histogram construction tool"), statTool("Bar chart tool"), statTool("Pie chart tool"), statTool("Line graph tool"), statTool("Scatter diagram tool"),
    statTool("Box-and-whisker plot tool"), statTool("Stem-and-leaf plot tool"), statTool("Cumulative frequency graph tool"), statTool("Ogive graph tool"), statTool("Mean calculator"), statTool("Median calculator"),
    statTool("Mode calculator"), statTool("Standard deviation calculator"), statTool("Data collection simulator"), statTool("Data sorting tool"), statTool("Frequency distribution tool"),
  ],
  "Trigonometry": [
    graph("Trigonometric circle", "sin"), graph("Unit circle", "sin"), shape("Right-angled triangle model", "right"), graph("Sine curve generator", "sin"), graph("Cosine curve generator", "cos"),
    graph("Tangent curve generator", "tan"), scale("Clinometer", 0, 90, 1, "°", "angles of elevation"), scale("Sextant", 0, 120, 0.1, "°", "the angle of the Sun or a star above the horizon"),
    shape("Angle of elevation simulator", "right"), shape("Angle of depression simulator", "right"), shape("Trigonometric ratio board", "right"), graph("Graph plotting tool", "sin"),
    graph("Radian measuring tool", "sin"), graph("Trigonometric table", "sin"), scale("Bearing compass", 0, 360, 1, "°", "bearings (clockwise from north)"), shape("SOH-CAH-TOA visualiser", "right"),
  ],
  "Coordinate geometry and graphs": [
    graph("Cartesian plane", "line"), same("Graph board"), graph("Coordinate plotting tool", "line"), graph("Gradient measuring tool", "line", "gradient"), graph("Midpoint visualiser", "line"),
    graph("Distance formula visualiser", "line"), graph("Straight-line graph generator", "line"), graph("Circle graph generator", "circle"), graph("Parabola graph generator", "quadratic"),
    graph("Hyperbola graph generator", "hyperbola"), same("Transformation grid"), graph("Reflection tool", "line"), graph("Rotation tool", "line"), graph("Enlargement tool", "line"), graph("Translation tool", "line"),
    graph("Vector board", "line"), graph("Vector arrows", "line"), solid("3D coordinate system", "cuboid"), graph("Graph intersection tool", "quadratic"), graph("Function plotting tool", "cubic"),
  ],
  "Probability": [
    same("Coins"), same("Six-sided dice"), rand("Coloured balls", "balls", 3), rand("Probability bags", "balls", 4), same("Spinners"), same("Random number generator"),
    rand("Cards (52-card deck)", "cards", 4, { icon: "🃏" }), rand("Probability trees", "coin"), rand("Venn diagram board", "balls", 4), rand("Two-way table board", "balls", 4),
    rand("Sample space generator", "dice", 6), rand("Experimental probability simulator", "dice", 6), rand("Theoretical probability calculator", "dice", 6), rand("Tree diagram constructor", "coin"),
    rand("Replacement and non-replacement simulator", "balls", 5),
  ],
  "Calculus": [
    graph("Gradient of curve visualiser", "quadratic", "gradient"), graph("Tangent line tool", "quadratic", "gradient"), graph("Secant line tool", "quadratic", "gradient"), graph("Differentiation graph visualiser", "cubic", "gradient"),
    graph("Integration area visualiser", "quadratic", "area"), graph("Riemann sum blocks", "quadratic", "area"), graph("Definite integral calculator", "cubic", "area"), graph("Function graph generator", "cubic"),
    graph("Limits visualiser", "hyperbola"), graph("Stationary point detector", "cubic", "stationary"), graph("Maximum and minimum point visualiser", "cubic", "stationary"), graph("Area under curve simulator", "quadratic", "area"),
    graph("Volume of revolution simulator", "line", "area"), graph("Differential equation visualiser", "exp", "gradient"), graph("Derivative calculator", "cubic", "gradient"), graph("Integral calculator", "cubic", "area"), graph("Curve sketching tool", "cubic", "stationary"),
  ],
  "Financial mathematics": [
    money("Play money", "change"), money("Currency notes", "change"), same("Coins"), money("Cash register", "change"), D("Calculator", { e: "money", calc: "simple" }, { icon: "🧮" }),
    money("Interest calculator", "simple"), money("Simple interest simulator", "simple"), money("Compound interest simulator", "compound"), money("Loan repayment calculator", "loan"), money("Discount calculator", "discount"),
    money("Profit and loss simulator", "profit"), money("Tax calculator", "tax"), money("Exchange rate simulator", "exchange"), money("Depreciation calculator", "depreciation"), money("Budget planning board", "budget"),
    money("Bank statement simulator", "budget"), money("Invoice generator", "tax"), money("Receipt generator", "change"),
  ],
};

// ── Build the inventory ──
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ICON: Record<Spec["e"], string> = { scale: "📏", vessel: "🧪", timer: "⏱️", heater: "🔥", circuit: "🔌", optic: "🔍", spring: "🌀", magnet: "🧲", radiation: "☢️", wave: "〰️", reagent: "🧴", indicator: "🌈", specimen: "🌿", model: "🫀", safety: "🦺", shape: "🔷", solid: "🧊", random: "🎲", money: "💷", graph: "📈", stats: "📊", microscope: "🔬", tool: "🔧" };
const HAZ: Record<Hazard, string> = { corrosive: "Corrosive — wear goggles and gloves; rinse spills with lots of water.", irritant: "Irritant — avoid skin and eyes.", toxic: "Toxic — use small amounts, in a fume cupboard if it gives off a gas.", flammable: "Flammable — keep away from flames.", oxidising: "Oxidising — keep away from flammable materials.", harmful: "Harmful — don't swallow; wash hands.", explosive: "Explosive mixtures with air — teacher only.", hot: "Hot — use tongs.", sharp: "Sharp — handle with care.", electrical: "Electrical — switch off before changing the circuit.", radiation: "Ionising radiation — tongs, distance, short time.", biological: "Biological hazard — wash hands; don't open sealed plates.", glass: "Glass — report breakages." };
export const hazardNote = (h: Hazard) => HAZ[h];

function describe(name: string, sp: Spec, o: O, subject: LabSubject): Pick<Item, "about" | "use" | "safety" | "props"> {
  const props: [string, string][] = [];
  let about = "", use = "", safety = "";
  switch (sp.e) {
    case "scale": {
      const dp = decimals(sp.lc), digital = /digital|electronic|meter|sensor|balance|probe|multimeter|analytical|top-pan|spectro|colori|refracto/i.test(name);
      props.push(["Range", `${sp.min}–${sp.max} ${sp.unit}`], ["Smallest division", `${sp.lc} ${sp.unit}`], ["Uncertainty", `± ${Number(uncertainty(sp.lc, digital).toFixed(dp + 1))} ${sp.unit}`], ["Display", digital ? "Digital" : "Scale (analogue)"]);
      about = `Measures ${sp.what}, from ${sp.min} to ${sp.max} ${sp.unit}, to the nearest ${sp.lc} ${sp.unit}.`;
      use = digital ? "Zero (tare) it first, then read the display once it is steady." : "Check the zero first. Read at eye level, at right angles to the scale, to the nearest smallest division.";
      break;
    }
    case "vessel": props.push(["Capacity", `${sp.cap} cm³`], ["Accuracy", `± ${sp.tol} cm³`], ["Heat it?", sp.heat ? "Yes" : "No"]);
      about = sp.graduated ? `Measures liquid volumes up to ${sp.cap} cm³, to ± ${sp.tol} cm³.` : `Holds up to ${sp.cap} cm³. Its marks are only a guide (± ${sp.tol} cm³) — use a measuring cylinder, pipette or burette to measure.`;
      use = sp.graduated ? "Stand it on a flat bench and read the bottom of the meniscus at eye level." : "Fill it no more than about two-thirds if you will heat or swirl it."; break;
    case "timer": props.push(["Resolution", `${sp.lc} s`]); about = `Times events to ${sp.lc} s — but starting and stopping by hand adds about 0.2 s of reaction time.`; use = "Time many swings or a long event so the reaction-time error is a small fraction of it."; break;
    case "heater": props.push(["Power", `${sp.power} W`]); about = sp.power ? `Supplies about ${sp.power} J of energy each second.` : "Records how a hot substance cools."; use = "Energy = power × time; heating water: ΔT = Pt ÷ (mc)."; safety = "Hot surfaces stay hot for a long time after switching off."; break;
    case "circuit": props.push(["Part", sp.part], ...(sp.value ? [["Value", `${sp.value}${sp.part === "fuse" ? " A rating" : sp.part === "capacitor" ? " μF" : sp.part === "cell" || sp.part === "supply" ? " V" : sp.part === "thermistor" ? " Ω at 25 °C" : " Ω"}`] as [string, string]] : []));
      about = `Try it in a circuit: change the p.d. and see the current.`; use = "Ammeters in series, voltmeters in parallel. Switch off between readings so parts don't heat up."; safety = HAZ.electrical; break;
    case "optic": props.push(...(sp.f ? [["Focal length", `${sp.f} cm`]] as [string, string][] : []), ...(sp.n ? [["Refractive index", String(sp.n)]] as [string, string][] : []));
      about = sp.part === "plane" ? "Image as far behind as the object is in front, upright, laterally inverted." : sp.f ? `${sp.f > 0 ? "Converging" : "Diverging"}: 1/f = 1/u + 1/v.` : "Bends or splits light: Snell's law n = sin i ÷ sin r."; use = "Work in a darkened room; mark rays with pins or a pencil."; break;
    case "spring": props.push(["Spring constant", `${sp.k} N/m`], ["Limit of proportionality", `${sp.limit} N`]); about = "Extension is proportional to the force (F = kx) up to its limit."; use = "Read the pointer at eye level; add masses one at a time."; safety = "Wear goggles; keep feet clear of the masses."; break;
    case "magnet": props.push(["Strength", `${sp.strength} (relative)`]); about = "Like poles repel, unlike attract; the field gets weaker quickly with distance."; use = "Store in pairs with keepers; don't drop them."; break;
    case "radiation": props.push(["Type", sp.kind], ...(sp.half ? [["Half-life", `${sp.half} throws`]] as [string, string][] : [])); about = sp.kind === "detector" ? "Counts ionising radiation; always measure and subtract the background count." : `Radiation that ${sp.kind === "alpha" ? "is stopped by paper or a few cm of air" : sp.kind === "beta" ? "is stopped by a few mm of aluminium" : sp.kind === "gamma" ? "is only reduced by thick lead" : "decays randomly"}.`; use = "Measure the count rate, subtract background, repeat."; safety = HAZ.radiation; break;
    case "wave": props.push(...(sp.f ? [["Frequency", `${sp.f} Hz`]] as [string, string][] : [])); about = "v = fλ."; use = sp.part === "fork" ? "Strike it on a rubber pad, never on the bench." : "Change the frequency and watch the wavelength change."; break;
    case "reagent": props.push(["Formula", sp.formula], ["pH", String(sp.pH)], ["Type", sp.kind], ...(sp.hazards.length ? [["Hazards", sp.hazards.join(", ")]] as [string, string][] : []));
      about = `${sp.kind === "acid" ? "An acid" : sp.kind === "alkali" ? "An alkali" : sp.kind === "salt" ? "A salt" : sp.kind === "metal" ? "A metal" : sp.kind === "gas" ? "A gas" : "A substance"} (${sp.formula}). Try the tests to see how it behaves.`;
      use = sp.kind === "gas" ? "Collect it, then test it with the right test." : "Use small amounts with a dropper; label everything."; safety = sp.hazards.length ? sp.hazards.map((h) => HAZ[h]).join(" ") : "Low hazard — still wear goggles."; break;
    case "indicator": about = "Changes colour with pH — try it across the pH scale."; use = "Add two or three drops; too much can change the result."; break;
    case "specimen": props.push(["Group", sp.group], ["Habitat", sp.habitat]); about = `${sp.group}. Look for: ${sp.features.slice(0, 3).join("; ")}.`; use = "Observe with a hand lens; draw it large, label it, give the magnification."; safety = "Wash your hands after handling specimens."; break;
    case "model": props.push(["Parts", String(sp.parts.length)]); about = `A labelled model: ${sp.parts.map((p) => p[0]).join(", ")}.`; use = "Name each part and say what it does."; break;
    case "safety": props.push(["Protects against", sp.protects.join(", ")]); about = o.use ?? ""; use = o.use ?? ""; break;
    case "shape": about = "Change its measurements and see its area, perimeter and angles."; use = "Measure lengths in the same unit."; break;
    case "solid": about = "Change its measurements and see its volume, surface area, faces, edges and vertices."; use = "Volume in cubic units, area in square units."; break;
    case "random": props.push(["Outcomes", String(sp.kind === "coin" ? 2 : sp.kind === "cards" ? 4 : sp.sides ?? 6)]); about = "Run many trials: the relative frequency gets closer to the theoretical probability."; use = "Record each result in a tally chart."; break;
    case "money": about = "Put in the amounts and see the calculation, step by step."; use = "Amounts in naira (₦)."; break;
    case "graph": about = sp.calculus === "gradient" ? "Plot a curve and find its gradient (the derivative) at any point." : sp.calculus === "area" ? "Plot a curve and find the area under it (the definite integral)." : sp.calculus === "stationary" ? "Find where the gradient is zero: maximum and minimum points." : "Plot the graph and change its coefficients."; use = "Choose sensible scales on both axes."; break;
    case "stats": about = "Type in data and see the mean, median, mode, range, quartiles and standard deviation."; use = "Separate values with commas or spaces."; break;
    case "microscope": props.push(["Eyepiece", `×${sp.eyepiece}`], ["Objectives", sp.objectives.map((x) => `×${x}`).join(", ")]); about = "Total magnification = eyepiece × objective."; use = "Start on the lowest power; focus up (away from the slide) with the coarse knob."; safety = "Never use direct sunlight with a mirror — it can damage your eyes."; break;
    case "tool": about = sp.use; use = sp.use; break;
  }
  if (!safety) safety = subject === "chemistry" ? "Wear goggles; tie back long hair." : subject === "biology" ? "Wash your hands afterwards." : subject === "physics" ? "Keep the bench tidy and dry." : "Handle sharp points (compasses) with care.";
  return { about: o.about ?? about, use: o.use ?? use, safety: o.safety ?? safety, props: [...props, ...(o.props ?? [])] };
}

type Built = { byName: Map<string, Item>; order: Item[]; pending: { name: string; section: string }[] };
function build(subject: LabSubject, sections: Record<string, Def[]>): Built {
  const byName = new Map<string, Item>(), order: Item[] = [], pending: { name: string; section: string }[] = [];
  for (const [section, defs] of Object.entries(sections)) {
    for (const d of defs) {
      if (!d.spec) { pending.push({ name: d.name, section }); continue; }
      const had = byName.get(d.name);
      if (had) { if (!had.sections.includes(section)) had.sections.push(section); continue; }
      const it: Item = { id: `${subject}-${slug(d.name)}`, name: d.name, subject, sections: [section], spec: d.spec, icon: d.o.icon ?? ICON[d.spec.e], bench: d.o.bench, ...describe(d.name, d.spec, d.o, subject) };
      byName.set(d.name, it); order.push(it);
    }
  }
  return { byName, order, pending };
}
// Items listed in several subjects ("Retort stand" in physics, "Beaker" in chemistry…) are shared.
const RAW = { physics: PHYSICS, chemistry: CHEMISTRY, biology: BIOLOGY, maths: MATHS } as const;
const built: Record<string, Built> = Object.fromEntries(Object.entries(RAW).map(([s, secs]) => [s, build(s as LabSubject, secs)]));
const ALL_BY_NAME = new Map<string, Item>();
for (const b of Object.values(built)) for (const it of b.order) if (!ALL_BY_NAME.has(it.name)) ALL_BY_NAME.set(it.name, it);
export const MISSING: string[] = [];
const ROOMS: Record<LabSubject, Item[]> = { physics: [], chemistry: [], biology: [], maths: [] };
for (const [s, b] of Object.entries(built)) {
  const list = [...b.order];
  for (const p of b.pending) {
    const mine = b.byName.get(p.name);
    if (mine) { if (!mine.sections.includes(p.section)) mine.sections.push(p.section); continue; }
    const other = ALL_BY_NAME.get(p.name);
    if (!other) { MISSING.push(`${s}: ${p.name}`); continue; }
    const copy: Item = { ...other, id: `${s}-${slug(p.name)}`, subject: s as LabSubject, sections: [p.section] };
    b.byName.set(p.name, copy); list.push(copy);
  }
  ROOMS[s as LabSubject] = list;
}
export { ROOMS };
export const SECTIONS: Record<LabSubject, string[]> = Object.fromEntries(Object.entries(RAW).map(([s, secs]) => [s, Object.keys(secs)])) as Record<LabSubject, string[]>;
export const ALL_ITEMS: Item[] = Object.values(ROOMS).flat();
export const itemById = (id: string) => ALL_ITEMS.find((x) => x.id === id) ?? null;
export const itemByName = (subject: LabSubject, name: string) => ROOMS[subject].find((x) => x.name === name) ?? null;
