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
    aim: "Roll a dice many times and decide whether it is fair.",
    steps: [
      "Write down the probability of a six on a fair dice. It is one sixth.",
      "Roll the dice twenty times, keeping a tally.",
      "Count the sixes and divide by the number of rolls to get the relative frequency.",
      "Carry on to one hundred rolls, then five hundred, working it out each time.",
      "Compare the relative frequency after five hundred rolls with one sixth, and decide if the dice is fair.",
    ],
    tips: [
      "Make a tally mark for every roll, in groups of five.",
      "Only trust a decision made after lots of rolls.",
    ],
    conclusion: "The more rolls you do, the closer the relative frequency gets to the true probability. If sixes come up far more than one time in six, the dice is biased.",
  },
  pythagoras: {
    aim: "Use Pythagoras' theorem to find which of two triangles has a right angle.",
    steps: [
      "Measure sides a, b and c of triangle A with the ruler, to the nearest millimetre.",
      "Measure the three sides of triangle B.",
      "Work out a squared plus b squared, and c squared, for each triangle.",
      "The triangle where they are equal has a right angle.",
      "Check that corner with a protractor.",
    ],
    tips: [
      "Put the zero of the ruler exactly on the end of each side.",
      "Side c is always the longest side, opposite the corner you are testing.",
    ],
    conclusion: "In a right-angled triangle, a squared plus b squared equals c squared. If c squared is bigger, the angle is more than ninety degrees.",
  },
  statistics: {
    aim: "Measure ten leaves and work out the mean, median and range of their lengths.",
    steps: [
      "Measure the first leaf from tip to tip, to the nearest millimetre.",
      "Measure the second and third leaves the same way.",
      "Measure the other seven.",
      "Add all ten lengths and divide by ten for the mean.",
      "Put them in order to find the median, and take the smallest from the biggest for the range.",
    ],
    tips: [
      "Measure every leaf the same way, without the stalk.",
      "With ten values, the median is halfway between the fifth and sixth.",
    ],
    conclusion: "The mean uses every value, the median is the middle value and is not affected by extreme leaves, and the range shows how spread out the lengths are.",
  },
  transformations: {
    aim: "Translate, reflect and rotate a triangle using tracing paper on a grid.",
    steps: [
      "Trace triangle A and slide the tracing paper by the vector, first across then up or down.",
      "Read the coordinates of the image of P.",
      "Flip the tracing paper over the y axis, and read the image of Q.",
      "Pin the tracing paper at the origin and turn it ninety degrees anticlockwise.",
      "Read the image of R and spot the rule.",
    ],
    tips: [
      "Hold the centre of rotation still with a pencil point.",
      "Read the x coordinate first, then the y coordinate.",
    ],
    conclusion: "A translation moves every point the same way, a reflection in the y axis changes the sign of x, and a ninety degree rotation anticlockwise about the origin takes x, y to minus y, x.",
  },
  quadratics: {
    aim: "Find the rectangle with the biggest area that can be made from a forty centimetre loop of string.",
    steps: [
      "Move the pins to make a rectangle three centimetres wide.",
      "Measure the other side and work out the area.",
      "Repeat for widths of six, ten, fourteen and seventeen centimetres.",
      "Plot area against width.",
      "Find the width that gives the biggest area.",
    ],
    tips: [
      "Keep the string tight so the perimeter stays forty centimetres.",
      "Plot the points and join them with a smooth curve, not straight lines.",
    ],
    conclusion: "The area is width times twenty minus width, a quadratic. The graph is a parabola, and the biggest area comes from a square, ten centimetres by ten.",
  },
  "unit-circle": {
    aim: "Find how the height of a point on a turning wheel changes with the angle turned.",
    steps: [
      "Turn the wheel to thirty degrees.",
      "Read the height of the red dot on the ruler.",
      "Work out sine of the angle as the height take away fifteen, divided by ten.",
      "Repeat for ninety, one hundred and fifty, two hundred and ten, two hundred and seventy and three hundred and thirty degrees.",
      "Plot the height against the angle.",
    ],
    tips: [
      "Read the ruler level with the dot, with your eye at the same height.",
      "Turn the wheel anticlockwise from the start line every time.",
    ],
    conclusion: "The height goes up and down in a sine curve. Sine is positive from zero to one hundred and eighty degrees, and negative from one hundred and eighty to three hundred and sixty degrees.",
  },
  "circle-theorems": {
    aim: "Measure angles in circles to discover two circle theorems.",
    steps: [
      "Measure angle A O B at the centre with the protractor.",
      "Measure angle A C B at the circumference.",
      "Move C to another point on the circle and measure again.",
      "Compare the angle at the centre with the angle at the circumference.",
      "Measure the angle in a semicircle.",
    ],
    tips: [
      "Put the centre of the protractor exactly on the corner of the angle.",
      "Line up the zero line along one arm before you read the other.",
    ],
    conclusion: "The angle at the centre is twice the angle at the circumference, wherever C is. So the angle in a semicircle is always ninety degrees.",
  },
  "linear-graphs": {
    aim: "Find the equation of the straight line that gives the height of a stack of cups.",
    steps: [
      "Stand one cup by the ruler and measure its height.",
      "Add cups one at a time, measuring the height each time.",
      "Plot height against the number of cups.",
      "Find the gradient, the height each extra cup adds, and the intercept.",
      "Use your equation to predict the height of twenty cups.",
    ],
    tips: [
      "Read the ruler level with the top rim.",
      "Draw one straight line through the points, not dot to dot.",
    ],
    conclusion: "The points lie on a straight line. The gradient is the height of one rim, the intercept is the part of a cup below its rim, and the equation predicts the height of any stack.",
  },
  mensuration: {
    aim: "Calculate the volume of a tin can, then check it by measuring the water it holds.",
    steps: [
      "Measure the diameter of the tin across the top.",
      "Measure its height.",
      "Halve the diameter for the radius, and work out pi times radius squared times height.",
      "Fill the tin with water and pour it into the measuring cylinder.",
      "Read the volume and compare it with your calculation.",
    ],
    tips: [
      "Measure the diameter through the middle of the circle.",
      "Read the measuring cylinder at the bottom of the meniscus.",
    ],
    conclusion: "The calculated volume and the measured volume agree to within a few per cent. The small difference comes from measuring and from the thickness of the tin.",
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
    aim: "Find how the launch angle affects how far a ball travels.",
    steps: [
      "Set the launcher to fifteen degrees.",
      "Pull back to the same notch and fire.",
      "Read the metre rule at the mark on the carbon paper.",
      "Repeat at thirty, forty five, sixty and seventy five degrees.",
      "Plot the range against the angle and find the best angle.",
    ],
    tips: [
      "Use the same spring setting every time, so only the angle changes.",
      "Fire three times at each angle and take the mean.",
    ],
    conclusion: "The range is greatest at forty five degrees. Angles that add up to ninety degrees, such as fifteen and seventy five, give about the same range.",
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
    aim: "Compare how four metals react with dilute hydrochloric acid and put them in order of reactivity.",
    steps: [
      "Add a piece of magnesium to the first tube of acid.",
      "Add zinc, iron and copper to the other tubes, using similar sized pieces.",
      "Watch for two minutes and compare the bubbling.",
      "Record what you see in each tube.",
      "Put the metals in order, most reactive first, and name the gas.",
    ],
    tips: [
      "Use the same volume and concentration of acid in every tube.",
      "Use pieces of metal of a similar size and surface area.",
    ],
    conclusion: "Magnesium is the most reactive, then zinc, then iron. Copper does not react. The gas given off is hydrogen, which burns with a squeaky pop.",
  },
  rates: {
    aim: "Find how the concentration of sodium thiosulfate affects how fast it reacts with hydrochloric acid.",
    steps: [
      "Put fifty cubic centimetres of sodium thiosulfate in the flask on the paper cross.",
      "Add ten cubic centimetres of hydrochloric acid and start the stopwatch.",
      "Look down through the flask and stop the clock when the cross disappears.",
      "Repeat with forty, thirty and twenty cubic centimetres of thiosulfate made up to fifty with water.",
      "Work out the rate as one thousand divided by the time and plot it against the volume of thiosulfate.",
    ],
    tips: [
      "Keep the total volume and the temperature the same for every run, so the test is fair.",
      "Have the same person watch the cross every time.",
    ],
    conclusion: "The higher the concentration, the faster the reaction, because there are more particles in the same space to collide each second.",
  },
  "gas-laws": {
    aim: "Show that the pressure of a fixed amount of gas is inversely proportional to its volume.",
    steps: [
      "Read the volume of the trapped air at atmospheric pressure, one hundred kilopascals.",
      "Pump the pressure up to one hundred and fifty kilopascals.",
      "Wait a moment, then read the new volume at the top of the oil.",
      "Repeat at two hundred, two hundred and fifty and three hundred kilopascals.",
      "Multiply each pressure by its volume and compare.",
    ],
    tips: [
      "Pump slowly and wait, so the air goes back to room temperature.",
      "Read the scale with your eye level with the oil.",
    ],
    conclusion: "Pressure times volume stays the same, so pressure is inversely proportional to volume at constant temperature. This is Boyle's law.",
  },
  electrolysis: {
    aim: "Find the mass of copper deposited on the cathode during the electrolysis of copper sulfate solution.",
    steps: [
      "Weigh the clean copper cathode.",
      "Put it in the copper sulfate solution and connect it to the negative terminal.",
      "Switch on and set the current to half an amp.",
      "Leave it for thirty minutes, then switch off.",
      "Rinse, dry and reweigh the cathode, and work out the mass gained.",
    ],
    tips: [
      "Keep the current steady by adjusting the rheostat.",
      "Dry the cathode carefully before weighing it again.",
    ],
    conclusion: "Copper ions gain electrons at the cathode and are deposited as copper, so the cathode gets heavier. The anode loses about the same mass.",
  },
  chromatography: {
    aim: "Separate the dyes in three inks and a mixture X, and find which inks are in X.",
    steps: [
      "Spot inks A, B, C and X on the pencil start line.",
      "Hang the paper in the beaker with the line above the water.",
      "Wait while the water rises up the paper.",
      "Take it out and mark how far the water reached.",
      "Measure the distances, work out the Rf value and match the spots of X with A, B and C.",
    ],
    tips: [
      "Draw the start line in pencil, because ink would move with the solvent.",
      "Keep the spots small and above the level of the water.",
    ],
    conclusion: "Each dye moves a different distance. The spots of X match the spots of two of the inks, so X is a mixture of those inks.",
  },
  "flame-tests": {
    aim: "Find the flame colours of some metal ions and use them to identify an unknown salt.",
    steps: [
      "Light the Bunsen burner, then open the air hole for a blue flame.",
      "Dip a clean nichrome loop into the first salt.",
      "Hold the loop in the edge of the flame and note the colour.",
      "Repeat for each salt, cleaning the loop in acid each time.",
      "Test the unknown salt and match its colour.",
    ],
    tips: [
      "Clean the loop in acid between tests so salts don't mix.",
      "Use the blue flame, because the yellow flame would hide the colours.",
    ],
    conclusion: "Lithium gives crimson red, sodium yellow orange, potassium lilac and copper blue green. The unknown's colour tells you which metal ion it contains.",
  },

  // ── Biology ──────────────────────────────────────────────────────────────
  photosynthesis: {
    aim: "Find how light intensity affects the rate of photosynthesis in pondweed.",
    steps: [
      "Put the lamp ten centimetres from the pondweed and leave it two minutes to adjust.",
      "Count the bubbles of oxygen given off in one minute.",
      "Repeat with the lamp at twenty, thirty and forty centimetres.",
      "Work out the light intensity as ten thousand divided by the distance squared.",
      "Plot the bubbles per minute against light intensity.",
    ],
    tips: [
      "Keep the temperature the same, for example with a beaker of water as a heat shield.",
      "Add sodium hydrogencarbonate to the water so carbon dioxide doesn't run out.",
    ],
    conclusion: "The closer the lamp, the faster the pondweed photosynthesises. At high light intensity the rate levels off because another factor, such as carbon dioxide or temperature, becomes limiting.",
  },
  cells: {
    aim: "Prepare a slide of onion skin and look at the cells under a light microscope.",
    steps: [
      "Peel a thin layer of skin from the inside of an onion layer.",
      "Lay it flat on a slide and add a drop of iodine.",
      "Lower a coverslip at an angle, so no air bubbles are trapped.",
      "Put the slide on the stage, switch on the light and use the ten times objective.",
      "Focus slowly, count the cells across the field of view and estimate the length of one cell.",
    ],
    tips: [
      "Always start with the lowest power objective.",
      "Focus by moving the lens away from the slide so you don't crack it.",
    ],
    conclusion: "Onion cells are long box shaped plant cells with a cell wall, cytoplasm, a vacuole and a nucleus, which iodine stains darkest. They have no chloroplasts.",
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
    aim: "Find the optimum temperature for the enzyme amylase.",
    steps: [
      "Set the water bath to twenty degrees and warm the amylase and starch.",
      "Mix them and start the clock.",
      "Every thirty seconds, test a drop with iodine on the spotting tile.",
      "Record the time when the iodine stays orange brown.",
      "Repeat at thirty, forty, fifty and sixty degrees, and find the fastest.",
    ],
    tips: [
      "Warm the amylase and the starch separately before mixing them.",
      "Use the same volumes and concentrations every time.",
    ],
    conclusion: "Amylase works fastest at its optimum temperature, about forty degrees. Above that the enzyme is denatured: its active site changes shape and starch no longer fits.",
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
    aim: "Find how wind, light and humidity affect how fast a leafy shoot takes up water.",
    steps: [
      "Reset the bubble to zero on the potometer scale.",
      "Leave it for five minutes in still air and read how far the bubble moved.",
      "Repeat with the fan on.",
      "Repeat with the lamp on.",
      "Repeat with a plastic bag over the shoot, then compare.",
    ],
    tips: [
      "Cut the shoot under water and fit it under water so no air gets in.",
      "Change only one condition at a time.",
    ],
    conclusion: "Moving air and bright light speed up transpiration. Humid air slows it, because there is less difference in water vapour between the leaf and the air.",
  },
  genetics: {
    aim: "Model a cross between two parents who are both Bb, using beads in bags.",
    steps: [
      "Say what gametes a Bb parent makes.",
      "Use a Punnett square to predict the ratio of brown eyes to blue eyes.",
      "Draw one bead from each bag forty times, tallying each pair.",
      "Count BB, Bb and bb, and work out brown divided by blue.",
      "Draw more pairs, up to two hundred, and compare the ratios.",
    ],
    tips: [
      "Put the beads back after every draw so the chances stay the same.",
      "Don't look when you pick a bead.",
    ],
    conclusion: "Bb crossed with Bb gives three brown eyed offspring to one blue eyed. Each offspring is a chance event, so the more offspring there are, the closer the ratio gets to three to one.",
  },
  fractions: {
    aim: "Use a folded paper strip to measure, compare and find equivalent fractions.",
    steps: [
      "Fold the strip into four equal parts and shade three of them.",
      "Measure three quarters of the strip.",
      "Fold it into eight parts and measure six eighths.",
      "Fold it into three parts and measure two thirds.",
      "Compare the lengths to find equivalent fractions and which fraction is bigger.",
    ],
    tips: [
      "Crease each fold firmly so the parts are exactly equal.",
      "Measure from the same end of the strip every time.",
    ],
    conclusion: "Three quarters and six eighths are the same length, so they are equivalent. Three quarters is longer than two thirds, so it is the bigger fraction.",
  },
  polygons: {
    aim: "Find the sum of the interior angles of a pentagon, and the rule for any polygon.",
    steps: [
      "Measure the angle at corner A with the protractor.",
      "Measure the angles at B, C, D and E.",
      "Add up the five angles.",
      "Compare your total with five hundred and forty degrees.",
      "Use the rule to find the angle sum of a hexagon.",
    ],
    tips: [
      "Extend short sides with a ruler so they reach the protractor's scale.",
      "Make sure you read the inside angle, which is less than one hundred and eighty degrees in this pentagon.",
    ],
    conclusion: "The angles of a pentagon add up to five hundred and forty degrees. A polygon with n sides splits into n take away two triangles, so its angle sum is n take away two, times one hundred and eighty degrees.",
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
    aim: "Find the pH of six solutions with universal indicator, and measure an unknown solution with a pH meter.",
    steps: [
      "Add a few drops of universal indicator to each of the six solutions.",
      "Match each colour with the pH chart and record the pH.",
      "Rinse the probe, then put the pH meter's probe into solution X.",
      "Record the reading on the meter.",
      "Decide whether X is acidic, neutral or alkaline, and how strong it is.",
    ],
    tips: [
      "Rinse the probe with distilled water between solutions.",
      "A pH meter is more precise than the indicator colour.",
    ],
    conclusion: "Acids have a pH below seven, neutral solutions seven, and alkalis above seven. The further the pH is from seven, the stronger the acid or alkali.",
  },
  "heart-rate": {
    aim: "Measure how exercise changes your heart rate, and how quickly it recovers.",
    steps: [
      "Count your pulse for fifteen seconds at rest and multiply by four.",
      "Step up and down for two minutes.",
      "Count your pulse again straight away.",
      "Rest, and count your pulse at one, two, three and four minutes after exercise.",
      "Plot heart rate against time.",
    ],
    tips: [
      "Use two fingers, not your thumb, which has its own pulse.",
      "Start counting as soon as the stopwatch starts.",
    ],
    conclusion: "Your heart rate rises during exercise to supply the muscles with more oxygen and glucose, then falls back towards resting. A fitter person recovers faster.",
  },

  "wire-resistance": {
    aim: "Find how the resistance of a wire depends on its length.",
    steps: [
      "Switch on the power supply.",
      "Move the crocodile clip to twenty centimetres.",
      "Read the ammeter, and divide the voltage by the current to get the resistance.",
      "Repeat for forty, sixty, eighty and one hundred centimetres.",
      "Plot resistance against length and find the gradient.",
    ],
    tips: [
      "Switch off between readings so the wire does not heat up.",
      "Make sure the crocodile clip touches the wire firmly.",
    ],
    conclusion: "Resistance is directly proportional to length. Twice the length of wire has twice the resistance.",
  },
  "electromagnet": {
    aim: "Find how the number of turns of wire affects the strength of an electromagnet.",
    steps: [
      "Wind ten turns of wire round the iron nail.",
      "Switch on, dip the nail into the paperclips and lift it.",
      "Count the paperclips it holds.",
      "Repeat with twenty, thirty, forty and fifty turns.",
      "Plot paperclips against turns.",
    ],
    tips: [
      "Keep the current the same every time.",
      "Use the same kind of paperclips, and lift the nail the same way.",
    ],
    conclusion: "More turns of wire make a stronger electromagnet. A bigger current or an iron core also makes it stronger.",
  },
  "insulation": {
    aim: "Find which material is the best insulator for a beaker of hot water.",
    steps: [
      "Pour the same volume of hot water into three beakers.",
      "Read the starting temperature.",
      "Leave them for ten minutes while the temperatures are recorded every two minutes.",
      "Read the final temperature of each beaker.",
      "Compare the temperature drops.",
    ],
    tips: [
      "Use the same volume and starting temperature in every beaker.",
      "Use the same thickness of each material.",
    ],
    conclusion: "The cotton wool beaker cooled the least. Trapped air is a poor conductor, so it reduces heat loss.",
  },
  "terminal-velocity": {
    aim: "Find the terminal velocity of ball bearings falling through oil.",
    steps: [
      "Drop the small ball bearing into the oil.",
      "Time it between the bands every twenty centimetres.",
      "Find the section where the time stops changing, and work out its speed.",
      "Repeat with the big ball bearing.",
      "Compare the two terminal velocities.",
    ],
    tips: [
      "Let the ball go just above the oil, without pushing it.",
      "Look straight across at each band as the ball passes it.",
    ],
    conclusion: "Each ball speeds up, then falls at a steady terminal velocity when drag and upthrust balance its weight. The bigger ball has a higher terminal velocity.",
  },
  "neutralisation": {
    aim: "Use the temperature change to find the volume of sodium hydroxide that neutralises some hydrochloric acid.",
    steps: [
      "Read the temperature of the acid in the polystyrene cup.",
      "Add five cubic centimetres of sodium hydroxide, stir and record the highest temperature.",
      "Keep adding five cubic centimetres at a time, recording each temperature.",
      "Plot temperature against volume added.",
      "Find where the rising and falling lines cross, and work out the concentration.",
    ],
    tips: [
      "Use a polystyrene cup with a lid to reduce heat loss.",
      "Stir well before you read the temperature.",
    ],
    conclusion: "Neutralisation is exothermic. The temperature is highest when the acid has just been neutralised, then falls as more cold alkali is added.",
  },
  "salts": {
    aim: "Make crystals of copper sulfate from copper oxide and sulfuric acid.",
    steps: [
      "Warm the sulfuric acid gently.",
      "Add copper oxide a spatula at a time until no more dissolves.",
      "Filter off the excess copper oxide.",
      "Heat the blue solution to evaporate some of the water.",
      "Leave it to cool and crystallise.",
    ],
    tips: [
      "Add the copper oxide in excess so all the acid is used up.",
      "Don't heat it to dryness. Slow crystallisation gives bigger crystals.",
    ],
    conclusion: "Copper oxide and sulfuric acid make copper sulfate and water. The blue crystals are copper sulfate.",
  },
  "gas-syringe": {
    aim: "Compare how fast marble chips and powdered marble react with acid.",
    steps: [
      "Add the marble chips to the acid and put the bung in.",
      "Read the gas syringe every thirty seconds for three minutes.",
      "Repeat with the same mass of powdered marble.",
      "Plot volume of gas against time for both.",
      "Compare the slopes at the start.",
    ],
    tips: [
      "Use the same mass of marble and the same acid each time.",
      "Put the bung in quickly so no gas escapes.",
    ],
    conclusion: "The powder reacts faster because it has a larger surface area, so there are more collisions each second. Both give the same final volume of gas.",
  },
  "ion-tests": {
    aim: "Identify metal ions and halide ions in unknown solutions.",
    steps: [
      "Add sodium hydroxide to tubes A, B and C.",
      "Use the colour of each precipitate to name the metal ion.",
      "Add dilute nitric acid and then silver nitrate to tubes D, E and F.",
      "Use the colour of each precipitate to name the halide ion.",
      "Explain why nitric acid is added first.",
    ],
    tips: [
      "Add the reagents a few drops at a time.",
      "Look at the colours against a white background.",
    ],
    conclusion: "Copper two gives a blue precipitate, iron two green and iron three orange brown. Chloride gives a white precipitate, bromide cream and iodide yellow.",
  },
  "yeast": {
    aim: "Find how temperature affects the rate of respiration in yeast.",
    steps: [
      "Set the water bath to twenty degrees.",
      "Count the bubbles of carbon dioxide for one minute.",
      "Repeat at thirty, forty, fifty and sixty degrees.",
      "Plot bubbles per minute against temperature.",
      "Find the temperature with the fastest rate.",
    ],
    tips: [
      "Leave the yeast a few minutes to reach each temperature.",
      "Use the same amounts of yeast and glucose each time.",
    ],
    conclusion: "Yeast respires fastest at about thirty five to forty degrees. Higher temperatures denature its enzymes. The limewater turns cloudy because carbon dioxide is given off.",
  },
  "leaf-starch": {
    aim: "Show that chlorophyll is needed for photosynthesis by testing a variegated leaf for starch.",
    steps: [
      "Boil the leaf in water for one minute.",
      "Turn off the flame, then put the leaf in hot ethanol in a water bath.",
      "When the leaf is pale, dip it in warm water to soften it.",
      "Spread it on a white tile and add iodine.",
      "See which parts turn blue black.",
    ],
    tips: [
      "Never heat ethanol with a naked flame. It is highly flammable.",
      "Spread the leaf flat so the colours are easy to see.",
    ],
    conclusion: "Only the parts that were green turn blue black, so only they made starch. Chlorophyll is needed for photosynthesis.",
  },
  "quadrats": {
    aim: "Estimate the number of daisies in a field using quadrats.",
    steps: [
      "Place the quadrat at a random spot in the field.",
      "Count the daisies inside it.",
      "Repeat for five quadrats.",
      "Work out the mean number of daisies per square metre.",
      "Multiply by the area of the field to estimate the population.",
    ],
    tips: [
      "Use random coordinates so the sample is fair.",
      "Use more quadrats for a more reliable estimate.",
    ],
    conclusion: "The mean per square metre times the area gives an estimate of the population. Because daisies grow in clumps, more quadrats give a better estimate.",
  },
  "reaction-time": {
    aim: "Measure your reaction time with a falling ruler, and compare your hands.",
    steps: [
      "Hold your finger and thumb open level with the zero mark.",
      "Your partner drops the ruler without warning, and you catch it.",
      "Read the distance at the top of your thumb.",
      "Do three drops with each hand.",
      "Find the mean distances and work out your reaction time.",
    ],
    tips: [
      "Look at the ruler, not at your partner's hand.",
      "Keep your hand at the same height every time.",
    ],
    conclusion: "The shorter the distance, the quicker the reaction. Reaction time is about a fifth of a second, and your writing hand is usually quicker.",
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
