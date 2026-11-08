// ── E-LABORATORY VOICE TUTOR — the spoken practical guides ────────────────
// One guide per experiment in lib/lab/catalog.ts. The voice tutor
// (components/lab/VoiceTutor.tsx) reads the aim, then walks the learner
// through each step using the controls they can see on screen, then the
// "do it well" tips (precautions, fair test, accuracy) and the conclusion.
// Written as speech: short sentences, no symbols that a voice would misread.

export type LabGuide = {
  aim: string;
  steps: string[];
  tips: string[];
  conclusion: string;
};

export const GUIDES: Record<string, LabGuide> = {
  // ── Mathematics ──────────────────────────────────────────────────────────
  probability: {
    aim: "Find out how the results of a real experiment get closer to the theoretical probability as you do more trials.",
    steps: [
      "Under Choose an experiment, pick the coin first.",
      "Before you start, say what you expect. For a fair coin, the probability of heads is one half.",
      "Press the smallest run button to do a few trials. Look at the results against theory. They will probably be quite far apart.",
      "Now press the larger run buttons, one after another, so the total trials grows into the thousands.",
      "Watch the graph of running proportion. Notice how it wobbles at first, then settles close to the theory line.",
      "Press Reset, then repeat with the dice and the spinner.",
    ],
    tips: [
      "Always compare relative frequency, which is the number of successes divided by the total trials, not the raw counts.",
      "Small samples can be misleading. Only trust a probability estimate from a large number of trials.",
    ],
    conclusion: "As the number of trials increases, the relative frequency gets closer to the theoretical probability. This is the law of large numbers.",
  },
  pythagoras: {
    aim: "Show that in a right-angled triangle, the square on the hypotenuse equals the sum of the squares on the other two sides.",
    steps: [
      "Use the Side a and Side b sliders to make a triangle. Start with a equals 3 and b equals 4.",
      "Read the a squared and b squared readouts, then add them in your head. You should get 25.",
      "Now read the hypotenuse c. It should be 5, and 5 squared is 25.",
      "Turn on the grid and count the unit squares on each side to see the areas match.",
      "Try three more triangles, including 5 and 12, and 6 and 8. Each time check that a squared plus b squared equals c squared.",
    ],
    tips: [
      "The hypotenuse is always the longest side, opposite the right angle.",
      "Write your results in a table with columns a, b, a squared plus b squared, and c squared.",
    ],
    conclusion: "For every right-angled triangle, a squared plus b squared equals c squared.",
  },
  statistics: {
    aim: "See how the mean, median, mode and range respond as you change a set of data.",
    steps: [
      "Load one of the preset data sets, or tap on the dot plot to add your own values.",
      "Read the mean, median, mode and range readouts.",
      "Add one very large value, an outlier. Watch which average changes the most.",
      "Use the remove button to take values away again, and see the averages respond.",
      "Look at the data in order and find the median yourself, then check it against the readout.",
    ],
    tips: [
      "The mean is affected by outliers, but the median is not. Choose the median when there are extreme values.",
      "For an even number of values, the median is halfway between the two middle values.",
    ],
    conclusion: "Different averages describe data in different ways. The mean uses every value, the median is the middle, the mode is the most common, and the range measures spread.",
  },
  transformations: {
    aim: "Describe reflections, rotations, translations and enlargements, and see how the coordinates change.",
    steps: [
      "Choose a shape, then choose Translation as the transformation.",
      "Use Move right and Move up to translate the shape. Watch each coordinate change by the same amount.",
      "Switch to Reflection and pick a mirror line. Check that each image point is the same distance from the mirror as the object point.",
      "Switch to Rotation and change the angle. Notice the shape keeps its size.",
      "Switch to Enlargement and change the scale factor. Compare the object area and the image area.",
    ],
    tips: [
      "To fully describe a transformation you must give every detail: the vector, the mirror line, the angle, direction and centre, or the scale factor and centre.",
      "With an enlargement of scale factor k, the area is multiplied by k squared.",
    ],
    conclusion: "Translations, reflections and rotations keep size and shape the same. Enlargements change the size, and the area grows by the scale factor squared.",
  },
  quadratics: {
    aim: "Find out how a, b and c change the graph of y equals a x squared plus b x plus c.",
    steps: [
      "Start with a equals 1, b equals 0 and c equals 0. You should see a U shaped parabola through the origin.",
      "Make a negative. The parabola turns upside down.",
      "Change c and watch the curve move up and down. c is where it crosses the y axis.",
      "Change b and watch the turning point and the line of symmetry move.",
      "Watch the discriminant readout. When it is positive there are two roots, zero gives one, and negative gives none.",
    ],
    tips: [
      "Read the roots where the curve crosses the x axis, and check them against the readout.",
      "The line of symmetry is at x equals minus b over 2 a.",
    ],
    conclusion: "a sets the shape and direction, c sets the y intercept, and the discriminant b squared minus 4 a c tells you how many real roots there are.",
  },
  "unit-circle": {
    aim: "See how sine and cosine come from a point moving round a circle of radius one.",
    steps: [
      "Move the angle slider slowly from 0 to 90 degrees. Watch cos theta fall from 1 to 0 and sin theta rise from 0 to 1.",
      "Keep going round to 360 degrees and watch the signs change in each quadrant.",
      "Press play and watch the sine and cosine waves draw themselves.",
      "Stop at 30, 45 and 60 degrees and write down the exact values.",
    ],
    tips: [
      "The x coordinate of the point is cos theta, and the y coordinate is sin theta.",
      "Remember all, sin, tan, cos for which ratios are positive in each quadrant.",
    ],
    conclusion: "Sine and cosine are the coordinates of a point on the unit circle, so they repeat every 360 degrees and stay between minus 1 and 1.",
  },
  "circle-theorems": {
    aim: "Prove the circle theorems by moving points round a circle.",
    steps: [
      "Choose the angle at the centre theorem.",
      "Move point A and point B. Compare angle A O B at the centre with angle A P B at the circumference.",
      "Read the ratio. It stays at 2, whatever you do.",
      "Switch to the semicircle theorem and check that the angle in a semicircle is always 90 degrees.",
      "Switch to the same segment theorem, move P and Q, and check that angle A P B equals angle A Q B.",
    ],
    tips: [
      "Keep P and Q on the same side of the chord, otherwise you are in a different segment.",
      "In exams, always name the theorem you use as your reason.",
    ],
    conclusion: "The angle at the centre is twice the angle at the circumference, the angle in a semicircle is a right angle, and angles in the same segment are equal.",
  },
  "linear-graphs": {
    aim: "Understand y equals m x plus c, and solve simultaneous equations by finding where two lines meet.",
    steps: [
      "Use Line 1. Change the gradient m and watch the line get steeper or flatter.",
      "Change the intercept c and watch the line move up and down without changing its slope.",
      "Now set Line 2 so it crosses Line 1. Read the solution, the point where they meet.",
      "Give both lines the same gradient. They become parallel, so there is no solution.",
    ],
    tips: [
      "Check a solution by substituting x and y into both equations.",
      "A negative gradient slopes down from left to right.",
    ],
    conclusion: "The gradient m sets the slope and c sets where the line crosses the y axis. Two lines meet at the solution of their simultaneous equations, unless they are parallel.",
  },
  mensuration: {
    aim: "Find out how the volume and surface area of solids change with their dimensions.",
    steps: [
      "Choose the cylinder.",
      "Change the height and watch the volume. Doubling the height doubles the volume.",
      "Now double the width instead. The volume grows four times. Think about why.",
      "Try the cone, sphere and cuboid, and compare their volume and surface area readouts.",
    ],
    tips: [
      "Always give units: square units for area and cubic units for volume.",
      "Write the formula first, substitute, then calculate.",
    ],
    conclusion: "Volume depends on three dimensions, so scaling every length by k multiplies the volume by k cubed and the surface area by k squared.",
  },

  // ── Physics ──────────────────────────────────────────────────────────────
  pendulum: {
    aim: "Measure the period of a simple pendulum for different lengths, and use a graph of T squared against L to find g.",
    steps: [
      "Set the length of the pendulum to forty centimetres, measured from the split cork to the middle of the bob.",
      "Pull the bob aside a little and let go. Time ten complete swings with the stopwatch.",
      "Write the time in your notebook, then repeat for sixty, eighty and one hundred centimetres.",
      "Divide each time by ten to get the period, square it, and plot T squared against L.",
      "Use the gradient to work out g.",
    ],
    tips: [
      "Time ten swings, not one, so your reaction time matters less.",
      "Keep the swings small, less than ten degrees, and start timing as the bob passes the middle.",
    ],
    conclusion: "T squared is proportional to L. The gradient is four pi squared divided by g, so g is four pi squared divided by the gradient, close to nine point eight metres per second squared.",
  },
  circuits: {
    aim: "Find how the current through a resistor depends on the potential difference across it, and find its resistance.",
    steps: [
      "Drag the ammeter into the gap in the circuit, in series with the resistor.",
      "Drag the voltmeter to the leads either side of the resistor, in parallel.",
      "Switch on, set the power supply to one volt and record the current.",
      "Repeat at two, three, four, five and six volts.",
      "Switch off and look at the graph. Work out the resistance from a pair of readings.",
    ],
    tips: [
      "Switch off between readings so the resistor stays cool.",
      "Plot current against potential difference. A straight line through the origin shows they are proportional.",
    ],
    conclusion: "The current is proportional to the potential difference, so the resistor obeys Ohm's law, and its resistance is the potential difference divided by the current.",
  },
  density: {
    aim: "Find the density of an irregular stone using a balance and a measuring cylinder.",
    steps: [
      "Put the stone on the balance and record its mass.",
      "Pour water into the measuring cylinder and read the bottom of the meniscus.",
      "Lower the stone gently into the water on its thread.",
      "Read the new water level. The rise is the volume of the stone.",
      "Divide the mass by the volume to get the density.",
    ],
    tips: [
      "Read the bottom of the meniscus with your eye level with the water.",
      "Lower the stone gently so no water splashes out.",
    ],
    conclusion: "The water rises by the stone's own volume. Density is mass divided by volume, and a stone is denser than water, so it sinks.",
  },
  projectile: {
    aim: "Find the launch angle that gives the greatest range, and see how gravity changes the flight.",
    steps: [
      "In Setup choose Earth, and set a launch speed of about 20 metres per second.",
      "Set the launch angle to 15 degrees and press Launch. Note the range.",
      "Launch again at 30, 45, 60 and 75 degrees, keeping the speed the same.",
      "Look at the graph of range against angle. Find the angle with the biggest range.",
      "Notice that 30 and 60 degrees give the same range.",
      "Change the planet to the Moon and launch again. Compare the range and flight time.",
    ],
    tips: [
      "Change only one thing at a time. Keep the speed fixed while you test angles.",
      "Horizontal and vertical motion are independent. Only the vertical motion is affected by gravity.",
    ],
    conclusion: "Ignoring air resistance, 45 degrees gives the maximum range, and complementary angles give equal ranges. Weaker gravity means a longer, higher flight.",
  },
  hooke: {
    aim: "Measure how a spring's extension depends on the force stretching it, and find its spring constant.",
    steps: [
      "Read where the pointer crosses the rule with no masses on the hanger.",
      "Add a one newton mass and read the pointer again.",
      "Keep adding masses one at a time up to five newtons, reading the pointer each time.",
      "Work out each extension by taking away the first reading.",
      "Plot force against extension in metres. The gradient is the spring constant.",
    ],
    tips: [
      "Read the pointer at eye level to avoid parallax error.",
      "Wait for the spring to stop bouncing before you read it.",
    ],
    conclusion: "Force is proportional to extension, so the spring obeys Hooke's law. The spring constant is the force divided by the extension.",
  },
  refraction: {
    aim: "Measure angles of refraction in a glass block and find the refractive index of glass.",
    steps: [
      "Switch on the ray box.",
      "Turn the ray box so the ray meets the normal at twenty degrees.",
      "Read the angle of refraction inside the block on the protractor, measured from the normal.",
      "Repeat for thirty, forty, fifty and sixty degrees.",
      "Plot sine i against sine r. The gradient is the refractive index.",
    ],
    tips: [
      "Always measure angles from the normal, not from the edge of the block.",
      "Use a narrow ray and mark it with small crosses far apart.",
    ],
    conclusion: "The ray bends towards the normal as it enters the glass. Sine i divided by sine r is constant, and that constant is the refractive index, about one and a half.",
  },
  moments: {
    aim: "Use the principle of moments to find an unknown mass on a balanced metre rule.",
    steps: [
      "Hang the one hundred gram mass on the left of the rule and slide it to the twenty centimetre mark.",
      "Hang the unknown mass on the right.",
      "Slide the unknown mass until the rule balances level.",
      "Measure each mass's distance from the pivot at the fifty centimetre mark.",
      "Use one hundred times its distance equals the unknown mass times its distance to find the unknown mass.",
    ],
    tips: [
      "Check the rule balances on its own before you hang any masses.",
      "Measure distances to the loop that holds each mass, not to the mass's edge.",
    ],
    conclusion: "When the rule balances, the anticlockwise moment equals the clockwise moment, so the unknown mass is one hundred grams times its distance divided by its own distance.",
  },
  lens: {
    aim: "Find the focal length of a convex lens by forming sharp images on a screen.",
    steps: [
      "Switch on the lamp. Its lit arrow is the object, at the zero mark.",
      "Put the lens twenty five centimetres from the object.",
      "Slide the screen until the image is as sharp as you can get it.",
      "Record the image distance, from the lens to the screen.",
      "Repeat with the lens at thirty and forty centimetres, then use one over f equals one over u plus one over v.",
    ],
    tips: [
      "Move the screen backwards and forwards past the sharpest point to find it exactly.",
      "Measure both distances from the middle of the lens.",
    ],
    conclusion: "The image is real and upside down. One over u plus one over v gives one over f, so the focal length comes out the same for every pair.",
  },
  "heating-curve": {
    aim: "Heat crushed ice steadily and record its temperature every minute until the water boils.",
    steps: [
      "Read the temperature of the crushed ice.",
      "Switch on the hotplate at a steady setting.",
      "Heat for twenty five minutes while the temperature is recorded every minute.",
      "Look at your graph and read the temperatures of the two flat parts.",
      "Explain why the temperature stops rising while the ice melts and the water boils.",
    ],
    tips: [
      "Stir gently so the whole beaker is the same temperature.",
      "Keep the heating steady so energy goes in at the same rate all the time.",
    ],
    conclusion: "The temperature stays at zero degrees while the ice melts and at one hundred degrees while the water boils, because the energy breaks bonds between particles instead of raising the temperature.",
  },
  waves: {
    aim: "Measure the wavelength of water waves in a ripple tank and find their speed.",
    steps: [
      "Switch on the lamp and the vibrating bar.",
      "Set the frequency to ten hertz.",
      "Measure the length of ten waves on the ruler under the tank, and divide by ten for the wavelength.",
      "Repeat at fifteen and twenty hertz.",
      "Multiply frequency by wavelength in metres to find the speed, and take the mean.",
    ],
    tips: [
      "Measure across ten waves, not one, to make the measurement more accurate.",
      "Keep the water the same depth, because the speed depends on depth.",
    ],
    conclusion: "Higher frequency gives a shorter wavelength, but frequency times wavelength stays the same, so the waves travel at the same speed.",
  },

  // ── Chemistry ────────────────────────────────────────────────────────────
  titration: {
    aim: "Find the concentration of hydrochloric acid by titrating it against twenty five cubic centimetres of point one molar sodium hydroxide.",
    steps: [
      "Drag the acid bottle onto the burette to fill it.",
      "Read the burette in the close up, at the bottom of the meniscus, and write the initial reading in your notebook.",
      "Fill the pipette with sodium hydroxide, then run it into the conical flask.",
      "Add three drops of phenolphthalein. The alkali turns pink.",
      "Put the flask on the white tile under the burette.",
      "Hold the tap to run in acid. When the pink starts to linger, add one drop at a time until it just disappears.",
      "Read the burette again, then work out the titre and the concentration.",
    ],
    tips: [
      "Read the burette at eye level, at the bottom of the meniscus, to the nearest point zero five.",
      "Do a rough titration first, then repeat until two titres agree within point one.",
    ],
    conclusion: "Moles of sodium hydroxide equal moles of acid at the end point, so the acid's concentration is the moles divided by the titre in cubic decimetres.",
  },
  reactivity: {
    aim: "Rank metals by how vigorously they react with water and acid.",
    steps: [
      "Choose a metal and choose what to add it to, water or acid.",
      "Watch the test tube carefully: bubbles, fizzing, heat or no change.",
      "Press Record observation.",
      "Test every metal in the same liquid.",
      "Use your observations to build the reactivity league table, most reactive at the top.",
    ],
    tips: [
      "Use the same amount of acid and the same size of metal for a fair test.",
      "More bubbles faster means a more reactive metal.",
    ],
    conclusion: "Metals higher in the reactivity series react more vigorously, displacing hydrogen from water or acid.",
  },
  rates: {
    aim: "Investigate how temperature, concentration and surface area affect the rate of reaction between marble chips and acid.",
    steps: [
      "Set the conditions: temperature, acid concentration and marble size.",
      "Press Add the acid. The gas syringe starts to collect carbon dioxide.",
      "Watch the volume against time graph and note the initial rate.",
      "Change only one condition, for example raise the temperature, and run again.",
      "Compare the curves. A steeper start means a faster rate.",
    ],
    tips: [
      "Change only one variable at a time. Keep the others fixed.",
      "The final volume depends on the amount of marble or acid, not the rate.",
    ],
    conclusion: "Higher temperature, higher concentration and smaller pieces all increase the rate, because particles collide more often and with more energy.",
  },
  "gas-laws": {
    aim: "Discover Boyle's law, Charles's law and the pressure law using a gas in a cylinder.",
    steps: [
      "Choose Boyle's law. Keep the temperature fixed.",
      "Push the piston to raise the pressure, and watch the volume fall.",
      "Check that pressure times volume stays about the same.",
      "Switch to Charles's law. Keep the pressure fixed and heat the gas. The volume rises.",
      "Switch to the pressure law. Keep the volume fixed and heat the gas. The pressure rises.",
    ],
    tips: [
      "Always use temperature in kelvin for gas law calculations. Add 273 to the Celsius value.",
      "Change slowly so the temperature stays steady in Boyle's law.",
    ],
    conclusion: "At constant temperature, pressure times volume is constant. At constant pressure, volume is proportional to kelvin temperature. At constant volume, pressure is proportional to kelvin temperature.",
  },
  electrolysis: {
    aim: "Electrolyse copper sulfate with copper electrodes and verify Faraday's first law.",
    steps: [
      "Set the current.",
      "Press Switch on and let the current flow.",
      "Read the mass of copper gained by the cathode, and the charge, which equals current times time.",
      "Press Record.",
      "Repeat for several times or currents, recording each result.",
      "Look at the graph of mass against charge. It is a straight line through the origin.",
    ],
    tips: [
      "In a real lab, wash the cathode, dry it and weigh it carefully before and after.",
      "Keep the current steady during each run.",
    ],
    conclusion: "The mass of copper deposited is proportional to the charge passed. This is Faraday's first law.",
  },
  chromatography: {
    aim: "Separate inks into their dyes, measure Rf values and identify an unknown ink.",
    steps: [
      "Look at the chromatography paper. The inks start on the pencil base line.",
      "Press Lower paper into solvent and let the solvent rise up the paper.",
      "Stop before the solvent reaches the top. Note the solvent front.",
      "For each spot, read how far it travelled and the Rf value.",
      "Compare the dyes in ink X with the known inks and decide which one it matches.",
    ],
    tips: [
      "Draw the base line in pencil, not pen, so it does not run.",
      "Keep the base line above the level of the solvent.",
      "Rf equals distance moved by the spot divided by distance moved by the solvent.",
    ],
    conclusion: "Each dye has its own Rf value in a given solvent, so matching spots identify the unknown ink.",
  },
  "flame-tests": {
    aim: "Identify metal ions from the colour they give in a Bunsen flame.",
    steps: [
      "Choose a salt and hold it in the flame. Note the colour.",
      "Press Clean the wire before every new test.",
      "Test every salt and learn its colour.",
      "Press Identify unknowns and name each unknown from its flame colour.",
    ],
    tips: [
      "Always clean the wire between tests, or the colours mix and give a false result.",
      "Lithium is crimson, sodium is yellow, potassium is lilac, calcium is orange red, and copper is blue green.",
    ],
    conclusion: "Each metal ion gives a characteristic flame colour, so a flame test identifies it.",
  },

  // ── Biology ──────────────────────────────────────────────────────────────
  photosynthesis: {
    aim: "Investigate how light intensity affects the rate of photosynthesis in pondweed, and find the limiting factor.",
    steps: [
      "Keep carbon dioxide and temperature fixed.",
      "Set the light intensity low. Count the oxygen bubbles per minute.",
      "Press Record.",
      "Increase the light intensity in steps, recording each time.",
      "Watch the graph. The rate rises, then levels off.",
      "When it levels off, look at the limiting factor readout. Then raise the carbon dioxide and see the rate rise again.",
    ],
    tips: [
      "Change only the light. Keep carbon dioxide and temperature the same for a fair test.",
      "In a real lab, wait a minute after each change before counting bubbles.",
    ],
    conclusion: "The rate of photosynthesis increases with light until another factor, carbon dioxide or temperature, becomes limiting.",
  },
  cells: {
    aim: "Identify the organelles in plant and animal cells and learn their functions.",
    steps: [
      "Choose the animal cell. Tap each organelle and listen to its job.",
      "Switch to the plant cell. Find the parts animal cells do not have: the cell wall, chloroplasts and the large vacuole.",
      "When you are ready, press Quiz me and tap the organelle that is named.",
    ],
    tips: [
      "Learn each organelle with its function, for example mitochondria release energy in respiration.",
      "Both cells have a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes.",
    ],
    conclusion: "Plant and animal cells share many organelles, but only plant cells have a cell wall, chloroplasts and a permanent vacuole.",
  },
  osmosis: {
    aim: "Find the concentration of sucrose solution with the same water potential as potato cells.",
    steps: [
      "Cut five potato cylinders with the cork borer.",
      "Weigh them, then put one in each sucrose solution, from zero to point eight molar.",
      "Leave them for an hour.",
      "Blot them dry on the paper towel and weigh them again.",
      "Work out the percentage change in mass and read where the graph crosses zero.",
    ],
    tips: [
      "Blot every cylinder the same way, so surface water doesn't add to the mass.",
      "Use percentage change, because the cylinders don't start with exactly the same mass.",
    ],
    conclusion: "Cylinders gain water in dilute solutions and lose water in concentrated ones. Where the line crosses zero, the solution has the same water potential as the potato cells.",
  },
  enzymes: {
    aim: "Find the optimum temperature and pH for an enzyme that digests starch.",
    steps: [
      "Set the temperature and pH in Conditions.",
      "Press Mix starch and enzyme. Iodine is tested every minute on the spotting tile.",
      "When the iodine stays orange brown, the starch is gone. Note the time to digest.",
      "Repeat at several temperatures, keeping the pH the same.",
      "Look at the graph of rate against temperature and find the peak.",
      "Then keep temperature fixed and change the pH to find the optimum pH.",
    ],
    tips: [
      "Rate equals one divided by the time taken.",
      "Above the optimum, the enzyme is denatured: its active site changes shape.",
    ],
    conclusion: "Enzyme activity rises with temperature up to an optimum, then falls sharply as the enzyme denatures. Each enzyme also has an optimum pH.",
  },
  "food-tests": {
    aim: "Test four foods for reducing sugar, starch and protein, and find what milk contains.",
    steps: [
      "Add Benedict's reagent to the four tubes, put them in the water bath and set it to eighty degrees.",
      "Heat for five minutes and record which tubes changed from blue.",
      "Add iodine to the spotting tile and record which foods turn blue black.",
      "Add biuret reagent to the second rack and record which tubes turn purple.",
      "Use your three results for food D to say what milk contains.",
    ],
    tips: [
      "Use equal volumes of food and reagent in every tube so the test is fair.",
      "Heat Benedict's in a water bath, never over a naked flame.",
    ],
    conclusion: "Glucose is a reducing sugar, starch turns iodine blue black, egg white is protein, and milk contains both a reducing sugar and protein.",
  },
  transpiration: {
    aim: "Measure the rate of transpiration with a potometer, and see how conditions change it.",
    steps: [
      "Set normal conditions: medium light, no wind, normal humidity and temperature.",
      "Press Start timing and watch how far the bubble moves.",
      "Press Save result.",
      "Reset the bubble, change one condition, such as wind, and run again.",
      "Compare the saved rates for each condition.",
    ],
    tips: [
      "Change only one condition at a time.",
      "In a real lab, cut the shoot under water so no air enters the xylem.",
    ],
    conclusion: "Transpiration is faster in bright light, wind, high temperature and low humidity.",
  },
  genetics: {
    aim: "Use a Punnett square to predict a monohybrid cross, then breed offspring to test the prediction.",
    steps: [
      "Choose a trait, then choose the genotypes of the two parents. Start with two heterozygous parents.",
      "Fill the Punnett square and predict the ratio of offspring.",
      "Press Breed 20 a few times and count the phenotypes.",
      "Compare your results with the 3 to 1 ratio.",
      "Clear the offspring and try a heterozygous parent with a homozygous recessive parent.",
    ],
    tips: [
      "A dominant allele is a capital letter. It shows whenever it is present.",
      "Breeding more offspring gets you closer to the predicted ratio.",
    ],
    conclusion: "Crossing two heterozygous parents gives a 3 to 1 ratio of dominant to recessive phenotypes.",
  },
  fractions: {
    aim: "Use a fraction wall to find equivalent fractions, compare fractions and add them.",
    steps: [
      "Use the sliders for the first fraction. Set it to two thirds. It shows in blue on the wall.",
      "Set the second fraction to three quarters. It shows in pink.",
      "Look at the dashed lines. The one further to the right is the bigger fraction. Check the Compare readout.",
      "Now try to make the two lines meet exactly. When they do, the fractions are equivalent and a green message appears.",
      "Read the Simplest readout to see each fraction in its lowest terms, and the Sum readout to see them added.",
    ],
    tips: [
      "To compare fractions on paper, rewrite them with the same denominator first.",
      "To simplify, divide the top and bottom by their highest common factor.",
    ],
    conclusion: "Fractions that reach the same point on the wall are equivalent. Comparing and adding is easy once fractions share a common denominator.",
  },
  polygons: {
    aim: "Discover the rule for the sum of the interior angles of a polygon, and the size of each exterior angle.",
    steps: [
      "Start with the slider at three sides. A triangle's angles add to one hundred and eighty degrees.",
      "Move the slider to four, five and six sides. Count the coloured triangles each time.",
      "Notice that from one corner there are always two fewer triangles than sides.",
      "Press Record at each number of sides to build a results table.",
      "Look at the dashed yellow line. It shows an exterior angle. Read its size in the readout.",
    ],
    tips: [
      "Interior and exterior angles at the same corner always add up to one hundred and eighty degrees.",
      "The exterior angles of any polygon add up to three hundred and sixty degrees.",
    ],
    conclusion: "The interior angles of a polygon with n sides add up to n minus two, times one hundred and eighty degrees. Each exterior angle of a regular polygon is three hundred and sixty divided by n.",
  },
  "free-fall": {
    aim: "Time a steel ball falling from different heights and use a graph to find g.",
    steps: [
      "Set the electromagnet so the ball is forty centimetres above the trapdoor.",
      "Switch off the magnet. The timer runs until the ball hits the trapdoor.",
      "Record the time, then repeat for sixty, eighty and one hundred centimetres.",
      "Square each time and plot height against time squared.",
      "g is twice the gradient.",
    ],
    tips: [
      "Measure the height from the bottom of the ball to the trapdoor.",
      "Repeat each drop and take the mean time.",
    ],
    conclusion: "The height is proportional to the time squared, so the ball accelerates uniformly. Twice the gradient gives g, close to nine point eight metres per second squared.",
  },
  "specific-heat": {
    aim: "Find the specific heat capacity of aluminium by heating a one kilogram block with an electric heater.",
    steps: [
      "Put the immersion heater and the thermometer into the holes in the block.",
      "Read the starting temperature.",
      "Switch on and heat for ten minutes, then switch off.",
      "Read the highest temperature and the energy on the joulemeter.",
      "Divide the energy by the mass times the temperature rise.",
    ],
    tips: [
      "Put a drop of oil in the thermometer hole so it touches the metal well.",
      "Wrap the block in insulation to cut down energy lost to the room.",
    ],
    conclusion: "The specific heat capacity is the energy divided by the mass times the temperature rise. Energy lost to the room makes the measured value higher than the true value.",
  },
  "ph-indicators": {
    aim: "Use indicators to find out whether substances are acids, alkalis or neutral, and estimate their pH.",
    steps: [
      "Choose lemon juice from the substance list, and choose universal indicator.",
      "Look at the colour in the test tube and where the arrow points on the pH scale.",
      "Press Record result to add it to your table.",
      "Test several more substances, from battery acid to drain cleaner.",
      "Now switch to litmus, then phenolphthalein, then methyl orange, and test the same substances.",
    ],
    tips: [
      "Use a clean test tube for every substance so results are not mixed up.",
      "Wear eye protection. Strong acids and alkalis such as drain cleaner are corrosive.",
    ],
    conclusion: "Acids have a pH below seven, alkalis above seven, and neutral substances are pH seven. Universal indicator shows how strong an acid or alkali is, while litmus only shows which type it is.",
  },
  "heart-rate": {
    aim: "Investigate how exercise changes heart rate, and how quickly it recovers afterwards.",
    steps: [
      "Set the age and resting heart rate. The graph starts at your resting rate.",
      "Choose jogging and press Exercise one minute three times.",
      "Watch the heart rate rise on the graph and read the percentage of maximum heart rate.",
      "Now press Rest one minute several times and watch the rate fall back.",
      "Press Reset, set fitness to high, and repeat. Compare the recovery time.",
    ],
    tips: [
      "In a real experiment, count your pulse for fifteen seconds and multiply by four.",
      "Rest until your pulse is steady before you measure your resting rate.",
    ],
    conclusion: "Heart rate rises during exercise to supply the muscles with more oxygen and glucose. A fitter person's heart rate rises less and returns to resting more quickly.",
  },

};

export const guideFor = (slug: string): LabGuide | null => GUIDES[slug] ?? null;

export type GuideLine = { kind: "aim" | "step" | "tip" | "conclusion"; n?: number; text: string };

// The guide as the voice reads it: aim, numbered steps, tips, conclusion.
export function guideScript(g: LabGuide): GuideLine[] {
  return [
    { kind: "aim", text: `Aim. ${g.aim}` },
    ...g.steps.map((text, i) => ({ kind: "step" as const, n: i + 1, text: `Step ${i + 1}. ${text}` })),
    ...g.tips.map((text) => ({ kind: "tip" as const, text: `To do it well: ${text}` })),
    { kind: "conclusion", text: `Conclusion. ${g.conclusion}` },
  ];
}

// Hands-free voice commands the tutor understands.
export type TutorCommand = "next" | "back" | "repeat" | "pause" | "resume" | "stop" | null;
export function parseCommand(heard: string): TutorCommand {
  const t = ` ${heard.toLowerCase().replace(/[^a-z ]/g, " ")} `;
  if (/ (next|done|continue|carry on|go on|finished) /.test(t)) return "next";
  if (/ (back|previous|go back) /.test(t)) return "back";
  if (/ (repeat|again|say that again|pardon) /.test(t)) return "repeat";
  if (/ (pause|wait|hold on) /.test(t)) return "pause";
  if (/ (resume|play|start) /.test(t)) return "resume";
  if (/ (stop|quiet|be quiet) /.test(t)) return "stop";
  return null;
}

// Clean text for the voice: no markdown, bullets or TeX-ish symbols.
export function forSpeech(s: string): string {
  return s.replace(/[*_#`>]+/g, "").replace(/\\\(|\\\)|\$+/g, "").replace(/^\s*[-•]\s*/gm, "").replace(/\s+\n/g, "\n").trim().slice(0, 900);
}
