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
    aim: "Investigate how the length of a pendulum affects its period, and verify T equals 2 pi root L over g.",
    steps: [
      "In Setup, choose Earth and keep the release angle small, about 10 to 15 degrees.",
      "Set the length to 0.4 metres.",
      "Press Time 10 swings. The stopwatch stops by itself after ten complete swings.",
      "Press Record reading. The period T is the time for 10 swings divided by 10.",
      "Increase the length in steps, to 0.6, 0.8, 1.0, 1.2 and 1.5 metres, and record a reading each time.",
      "Look at the graph of period squared against length. It should be a straight line through the origin.",
    ],
    tips: [
      "Time 10 swings, not one. This reduces the error from your reaction time.",
      "Keep the release angle small, under 15 degrees, or the formula is no longer accurate.",
      "Change only the length. Keep the angle and planet the same for a fair test.",
    ],
    conclusion: "The period increases with length. T squared is proportional to L, and the gradient of the graph is 4 pi squared over g, which lets you find g.",
  },
  circuits: {
    aim: "Investigate the relationship between voltage and current for a resistor, and verify Ohm's law.",
    steps: [
      "Set the resistance to a fixed value, for example 10 ohms.",
      "Set the battery voltage to 1 volt and close the switch. The bulb lights.",
      "Read the current, then press Plot this point.",
      "Increase the voltage in steps of 1 volt, and plot a point each time, up to about 6 volts.",
      "Look at the graph of voltage against current. It is a straight line through the origin.",
      "Clear the graph and repeat with a bigger resistance. The line is steeper.",
    ],
    tips: [
      "Open the switch between readings in a real lab, so the wire does not heat up and change its resistance.",
      "Keep the resistance the same while you change the voltage.",
    ],
    conclusion: "For a fixed resistor, current is directly proportional to voltage. The gradient of V against I is the resistance, so V equals I R.",
  },
  density: {
    aim: "Predict whether objects sink or float by comparing their density with the density of the liquid.",
    steps: [
      "Choose a liquid, and read its density.",
      "Choose an object and read its density.",
      "Before dropping it, make a prediction. Press Float or Sink.",
      "Press Drop it in and check whether you were right.",
      "Try the same object in a different liquid, and see if the answer changes.",
    ],
    tips: [
      "Compare the two densities every time. If the object is less dense than the liquid, it floats.",
      "Density equals mass divided by volume, measured in grams per cubic centimetre.",
    ],
    conclusion: "An object floats if its density is less than the liquid's density, and sinks if it is greater.",
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
    aim: "Investigate how the extension of a spring depends on the load, and find the spring constant.",
    steps: [
      "Choose a spring. Start with no load and note the extension is zero.",
      "Add one mass using the plus button, then press Record reading.",
      "Keep adding one mass at a time, recording after each one.",
      "Watch the graph of load against extension. It starts as a straight line.",
      "Keep loading until the line starts to curve. That is the elastic limit.",
    ],
    tips: [
      "In a real lab, read the pointer at eye level to avoid parallax error.",
      "Remove the loads afterwards to check the spring returns to its original length.",
    ],
    conclusion: "Up to the elastic limit, extension is proportional to load. F equals k e, and the gradient gives the spring constant k.",
  },
  refraction: {
    aim: "Investigate how light bends when it passes between materials, and find the critical angle.",
    steps: [
      "In Setup, start the ray in air and let it enter glass.",
      "Change the angle of incidence. Read the angle of refraction and notice it is smaller.",
      "Now start the ray in glass going into air. The ray bends away from the normal.",
      "Increase the angle of incidence slowly until the refracted ray skims along the surface. That is the critical angle.",
      "Go past it and see total internal reflection.",
      "Repeat with water and diamond and compare the critical angles.",
    ],
    tips: [
      "Always measure angles from the normal, the dashed line at 90 degrees to the surface.",
      "Total internal reflection only happens going from a denser to a less dense material.",
    ],
    conclusion: "Light bends towards the normal entering a denser material. Snell's law links the angles, and beyond the critical angle all the light reflects.",
  },
  moments: {
    aim: "Verify the principle of moments, and use it to find an unknown mass.",
    steps: [
      "Hang a mass on the left side and set its distance from the pivot.",
      "Hang a mass on the right side, and move it until the rule balances.",
      "Read the clockwise and anticlockwise moments. When balanced, they are equal and the net moment is zero.",
      "Now use the mystery mass. Balance it, then calculate its mass using m one d one equals m two d two.",
      "Type your answer in grams and press Check.",
    ],
    tips: [
      "Measure distances from the pivot to the centre of each mass.",
      "Moment equals force times perpendicular distance.",
    ],
    conclusion: "When a body is balanced, the sum of the clockwise moments equals the sum of the anticlockwise moments.",
  },
  lens: {
    aim: "Find out how the position of an object changes the image formed by a convex lens.",
    steps: [
      "Set the focal length to a fixed value.",
      "Put the object far away, more than twice the focal length. The image is real, inverted and smaller.",
      "Move the object to exactly twice the focal length. The image is the same size.",
      "Move it between f and 2 f. The image is real, inverted and magnified.",
      "Move it inside the focal length. The image becomes virtual, upright and magnified, like a magnifying glass.",
      "At each position, check that one over f equals one over u plus one over v.",
    ],
    tips: [
      "Write down u, v and the magnification for at least five positions.",
      "Magnification equals image distance divided by object distance.",
    ],
    conclusion: "A convex lens forms real images when the object is beyond the focal point, and a virtual magnified image when it is inside. The lens formula links u, v and f.",
  },
  "heating-curve": {
    aim: "Plot the heating curve of water and use the flat parts to find latent heat.",
    steps: [
      "Set up a mass of ice and a heater power.",
      "Press Switch heater on and watch the temperature against time graph.",
      "Notice the first flat part at 0 degrees. The ice is melting.",
      "The temperature rises again, then flattens at 100 degrees while the water boils.",
      "Note how long each flat part lasts. Energy in equals power times time.",
    ],
    tips: [
      "During a change of state the temperature stays the same even though energy is going in.",
      "Stir in a real experiment so the temperature is even.",
    ],
    conclusion: "Energy supplied during melting and boiling breaks bonds instead of raising temperature. Latent heat equals energy divided by mass.",
  },
  waves: {
    aim: "Investigate how frequency, wavelength and speed of a wave are related.",
    steps: [
      "Choose a medium and read the wave speed.",
      "Increase the frequency. Watch the wavelength get shorter.",
      "Check that wave speed equals frequency times wavelength, using the readouts.",
      "Change the amplitude. Notice it does not change the speed or wavelength.",
      "Change the medium and see the speed and wavelength change while the frequency stays the same.",
    ],
    tips: [
      "Period is one over frequency.",
      "Amplitude is the height from the middle to a peak, not peak to trough.",
    ],
    conclusion: "Wave speed equals frequency times wavelength. In one medium, a higher frequency means a shorter wavelength.",
  },

  // ── Chemistry ────────────────────────────────────────────────────────────
  titration: {
    aim: "Find the volume of sodium hydroxide needed to neutralise the acid, using an indicator and a pH meter.",
    steps: [
      "In Setup, note the acid concentration.",
      "First do a rough titration. Add the alkali 5 millilitres at a time and watch the indicator.",
      "When the colour changes, note the volume. That is your rough end point. Press Reset.",
      "Now do an accurate run. Add quickly to about 2 millilitres before the rough end point.",
      "Then add 1 millilitre, and near the end add one drop at a time.",
      "Stop at the first permanent colour change. Read the volume of sodium hydroxide added.",
      "Look at the pH curve. The end point is the steep part in the middle.",
    ],
    tips: [
      "Add drop by drop near the end point so you do not overshoot.",
      "In a real lab, swirl the flask after every addition and read the burette at eye level, at the bottom of the meniscus.",
      "Repeat until you get two results within 0.1 millilitres of each other, and average them.",
    ],
    conclusion: "At the end point the acid is exactly neutralised. Use the volume and concentration to calculate moles with moles equals concentration times volume.",
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
    aim: "Find the concentration of sugar solution that is isotonic with potato cells.",
    steps: [
      "Look at the six sucrose solutions, from pure water to the most concentrated.",
      "Press Soak for each concentration, or press Soak all six.",
      "Read the percentage change in mass for each cylinder.",
      "Look at the graph. Find where the line crosses zero change in mass.",
      "Enter that concentration as your isotonic estimate.",
    ],
    tips: [
      "Use percentage change in mass, not the change in grams, because the cylinders may start at different masses.",
      "In a real lab, blot the cylinders dry before weighing them.",
    ],
    conclusion: "Potato gains mass in dilute solutions and loses mass in concentrated ones. Where there is no change, the solution is isotonic with the cells.",
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
    aim: "Test foods for starch, sugar, protein and fat, and fill in a results table.",
    steps: [
      "Choose a food and choose a test.",
      "Press Add reagent and watch the colour.",
      "For the Benedict's test, heat the tube as well.",
      "Record the result in the table, then test the same food with every reagent.",
      "Repeat for the other foods.",
    ],
    tips: [
      "Iodine turns blue black with starch. Benedict's turns brick red with reducing sugar when heated. Biuret turns purple with protein. Ethanol gives a cloudy white emulsion with fat.",
      "Use a clean tube for each test so results do not mix.",
    ],
    conclusion: "Each food test gives a specific colour change, so you can tell which nutrients a food contains.",
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
    aim: "Measure the acceleration due to gravity by timing a falling ball.",
    steps: [
      "Choose Earth and set the drop height to two metres.",
      "Press Drop. The ball falls through the light gate and the stopwatch shows the time.",
      "Press Record time to add the reading to your table.",
      "Change the height and repeat for at least five different heights.",
      "Look at the graph of height against time squared. Read your average value of g.",
      "Now try the Moon or Jupiter and compare.",
    ],
    tips: [
      "Repeat each drop and take an average, because reaction time adds error to a stopwatch.",
      "Taller drops give more accurate results, because the reaction error is a smaller part of the time.",
    ],
    conclusion: "For a dropped object, g equals two times the height divided by the time squared. On Earth this comes out close to nine point eight one metres per second squared.",
  },
  "specific-heat": {
    aim: "Find the specific heat capacity of a material by heating it with an electric heater.",
    steps: [
      "Choose aluminium, set the heater to fifty watts, and keep the block insulated.",
      "Press Heat one minute several times, watching the thermometer and the graph.",
      "Read the energy supplied and the temperature rise below the graph.",
      "Read your calculated value of c and compare it with the textbook value.",
      "Press Reset, remove the insulation, and repeat. Notice what happens to your value of c.",
      "Try copper, iron and water and compare how quickly they warm up.",
    ],
    tips: [
      "Insulate the block so less energy escapes to the surroundings.",
      "Wait for the thermometer reading to stop rising before you take the final temperature.",
    ],
    conclusion: "Specific heat capacity equals energy supplied divided by mass times temperature rise. Water has a very high specific heat capacity, so it warms up and cools down slowly.",
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
