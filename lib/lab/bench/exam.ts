// Exam-style questions after each practical, like the practical papers
// (WAEC / NECO alternative-to-practical, GCSE required practicals): why a step
// is done, what limits the accuracy, how to improve it, what the variables are.
// Multiple choice, so they mark themselves; `why` is the mark-scheme point.
export type ExamQ = { q: string; right: string; wrong: string[]; why: string };

const Q = (q: string, right: string, wrong: string[], why: string): ExamQ => ({ q, right, wrong, why });

export const EXAM: Record<string, ExamQ[]> = {
  // ── Mathematics ──
  probability: [
    Q("Why roll the dice 500 times rather than 20?", "The relative frequency gets closer to the true probability with more trials", ["It makes the dice fairer", "So that every number comes up exactly the same number of times", "20 rolls would take too long to record"], "More trials give a more reliable estimate of the probability."),
    Q("A fair dice is rolled 600 times. About how many sixes would you expect?", "100", ["60", "6", "300"], "Expected frequency = probability × trials = 1/6 × 600 = 100."),
    Q("Sixes came up 150 times in 500 rolls. What should you conclude?", "The dice is probably biased towards six", ["The dice is fair", "Six is the least likely number", "Nothing — 500 rolls is not enough to say anything"], "Expected about 83; 150 is far more, so the dice is likely biased."),
  ],
  pythagoras: [
    Q("Which triangle has a right angle?", "The one where a² + b² equals c² (c the longest side)", ["The one with the longest perimeter", "The one where a + b equals c", "The one with all three sides equal"], "Pythagoras' theorem only holds for a right-angled triangle."),
    Q("Your measured sides give a² + b² = 100.4 and c² = 100. Why aren't they exactly equal?", "The sides were measured to the nearest mm, so there is a small measuring error", ["The triangle can't be right-angled", "Pythagoras' theorem is only approximate", "The ruler was the wrong way round"], "Rounding each length gives small errors; a close match still shows a right angle."),
    Q("How could you check the right angle a second way?", "Measure the angle with a protractor", ["Measure the perimeter", "Add up the three sides", "Fold the triangle in half"], "A protractor should read 90° at the corner opposite the hypotenuse."),
  ],
  statistics: [
    Q("Why is the median sometimes better than the mean?", "It isn't affected by one very large or very small value", ["It is always bigger than the mean", "It uses every value in a calculation", "It is the most common value"], "Extreme values (outliers) pull the mean but not the median."),
    Q("How do you find the median of 10 leaf lengths?", "Put them in order and take the mean of the 5th and 6th", ["Take the 5th length as measured", "Add them all and divide by 10", "Subtract the smallest from the largest"], "With an even number of values the median is halfway between the middle two."),
    Q("What does the range tell you?", "How spread out the lengths are", ["The typical length", "The most common length", "The total length of all the leaves"], "Range = largest − smallest: a measure of spread."),
  ],
  transformations: [
    Q("When you rotate a shape, what stays the same?", "Its size and shape", ["Its position", "The coordinates of every corner", "The direction it faces"], "Rotations, reflections and translations keep the shape congruent."),
    Q("A translation by the vector (3, −2) moves each point…", "3 right and 2 down", ["3 up and 2 left", "2 right and 3 down", "3 left and 2 up"], "The top number is across (+ right), the bottom is up/down (− down)."),
    Q("To describe a rotation fully you must give…", "The centre, the angle and the direction", ["Only the angle", "The mirror line", "A vector"], "A rotation needs centre, angle and clockwise/anticlockwise."),
  ],
  quadratics: [
    Q("With a 40 cm loop, which rectangle has the biggest area?", "The square, 10 cm by 10 cm", ["A long thin one, 19 cm by 1 cm", "15 cm by 5 cm", "They all have the same area"], "For a fixed perimeter the area is greatest when the rectangle is a square."),
    Q("If the width is w, the length is 20 − w. What is the area?", "A = w(20 − w)", ["A = 40w", "A = w + 20", "A = 2w + 40"], "Width + length = half the perimeter = 20 cm."),
    Q("What shape is the graph of area against width?", "A parabola (an upside-down U)", ["A straight line", "A circle", "A horizontal line"], "A = 20w − w² is a quadratic with a maximum point."),
  ],
  "unit-circle": [
    Q("For a wheel of radius 10 cm, the height of the dot above the centre is…", "10 × sin(angle)", ["10 × cos(angle)", "10 ÷ sin(angle)", "angle ÷ 10"], "Height = radius × sin θ: this is where the sine curve comes from."),
    Q("At what angle is the dot highest?", "90°", ["0°", "180°", "360°"], "sin 90° = 1, its largest value."),
    Q("What happens to the graph after 360°?", "It repeats", ["It stops", "It becomes a straight line", "It doubles in height"], "One turn brings the dot back to the start: the sine graph is periodic."),
  ],
  "circle-theorems": [
    Q("The angle at the centre is 100°. What is the angle at the circumference on the same arc?", "50°", ["100°", "200°", "80°"], "The angle at the centre is twice the angle at the circumference."),
    Q("What is the angle in a semicircle?", "90°", ["180°", "45°", "60°"], "An angle drawn from the ends of a diameter to the circle is a right angle."),
    Q("Your two angles measured 101° and 49°. Why not exactly 2 : 1?", "Small errors in placing and reading the protractor", ["The theorem is wrong for big circles", "The circle wasn't round", "Angles can't be measured with a protractor"], "Measurements to the nearest degree carry small errors."),
  ],
  "linear-graphs": [
    Q("In h = mn + c for the stack of cups, what does m stand for?", "The extra height each cup adds", ["The height of one whole cup", "The number of cups", "The height of the table"], "The gradient is the increase in height per cup."),
    Q("Why is the graph a straight line?", "Each extra cup adds the same height", ["Cups are all the same colour", "The first cup is tallest", "Height doubles with each cup"], "A constant increase per cup gives a linear graph."),
    Q("Predicting the height of 20 cups from 6 measured cups is…", "Extrapolation — less reliable than reading within your data", ["Interpolation", "Always exact", "Impossible"], "Extending the line beyond the data assumes the pattern carries on."),
  ],
  mensuration: [
    Q("Why measure the diameter and halve it, rather than measure the radius?", "The centre is hard to find; the widest distance across is easy to measure", ["The radius is longer", "Radius can't be measured with a ruler", "Diameter is always exact"], "Measuring across the widest part gives the diameter accurately."),
    Q("The water measured slightly less than V = πr²h. A likely reason is…", "The tin's walls take up some space, so the inside is a little smaller", ["π is not exactly 3", "Water expands in a tin", "The ruler was too long"], "Outside measurements include the thickness of the metal."),
    Q("The volume of a cylinder is…", "πr²h", ["2πrh", "πr²", "πd h"], "Area of the circular end × height."),
  ],
  fractions: [
    Q("A strip folded into 8 equal parts: 4 parts is the same length as…", "1/2 of the strip", ["1/4 of the strip", "4/4 of the strip", "1/8 of the strip"], "4/8 simplifies to 1/2: they are equivalent fractions."),
    Q("Which is bigger, 3/4 or 5/8?", "3/4", ["5/8", "They are equal", "You can't compare them"], "3/4 = 6/8, which is more than 5/8."),
    Q("Why must the folds be equal?", "Each part must be the same fraction of the strip", ["To make the strip shorter", "So the paper doesn't tear", "It doesn't matter"], "A fraction means equal parts of the whole."),
  ],
  polygons: [
    Q("The interior angles of a pentagon add up to…", "540°", ["360°", "720°", "180°"], "(n − 2) × 180° = 3 × 180° = 540°."),
    Q("The rule for the sum of interior angles of an n-sided polygon is…", "(n − 2) × 180°", ["n × 180°", "360° ÷ n", "(n + 2) × 90°"], "A polygon splits into n − 2 triangles from one corner."),
    Q("Your angles added to 538°. Why?", "Each angle was measured to the nearest degree, so small errors add up", ["The pentagon isn't a polygon", "The rule is wrong", "One angle must be missing"], "Five small reading errors can add to a couple of degrees."),
  ],
  // ── Physics ──
  pendulum: [
    Q("Why time 10 swings and divide by 10?", "It makes the reaction-time error in starting and stopping the watch ten times smaller", ["The pendulum swings faster at first", "One swing is too fast to see", "It makes the period longer"], "The same reaction-time error is spread over 10 periods."),
    Q("Where should the length L be measured to?", "The centre of the bob", ["The top of the bob", "The bottom of the bob", "The floor"], "The pendulum's length is from the pivot to the bob's centre of mass."),
    Q("One of three timings was much shorter than the others. What should you do?", "Treat it as anomalous, leave it out and average the other two", ["Use only that reading", "Average all three", "Start the whole experiment again with a new bob"], "An anomaly is left out of the mean (it may be a miscounted swing)."),
  ],
  hooke: [
    Q("Extension is…", "The new length minus the original length", ["The new length", "The force divided by the length", "The original length minus the new length"], "Extension = stretched length − unstretched length."),
    Q("Why read the pointer at eye level?", "To avoid parallax error", ["To keep the spring straight", "Because the rule is upside down", "To make the spring stretch less"], "Looking from above or below makes the reading too high or low."),
    Q("What does a straight line through the origin on a force–extension graph show?", "Extension is proportional to force (Hooke's law)", ["The spring has broken", "The spring is past its limit of proportionality", "Force and extension are unrelated"], "Proportional quantities give a straight line through (0, 0)."),
  ],
  density: [
    Q("How is the volume of an irregular stone measured?", "By how much water it displaces in a measuring cylinder", ["With a ruler", "By weighing it", "By its shadow"], "Volume of stone = rise in water level."),
    Q("Density is…", "mass ÷ volume", ["volume ÷ mass", "mass × volume", "mass − volume"], "ρ = m ÷ V."),
    Q("Why lower the stone gently on a thread?", "So no water splashes out, which would make the volume too small", ["To make it heavier", "To warm the water", "So it floats"], "Splashed water is not counted in the reading."),
  ],
  moments: [
    Q("The principle of moments says that when the rule balances…", "The clockwise moments equal the anticlockwise moments", ["The two masses are equal", "The pivot carries no force", "The rule has no weight"], "Sum of clockwise moments = sum of anticlockwise moments."),
    Q("A moment is…", "force × perpendicular distance from the pivot", ["force ÷ distance", "mass × length of the rule", "force + distance"], "Moment = F × d, in N m."),
    Q("Why put the pivot at the rule's centre of mass (50 cm)?", "So the rule's own weight has no moment", ["To make it lighter", "So the masses fall off evenly", "It gives bigger readings"], "The weight acts through the pivot, so its moment is zero."),
  ],
  refraction: [
    Q("Angles of incidence and refraction are measured from…", "The normal", ["The surface of the block", "The edge of the paper", "The ray box"], "The normal is the line at 90° to the surface."),
    Q("The refractive index of glass is…", "sin i ÷ sin r", ["i ÷ r", "sin r ÷ sin i", "i − r"], "Snell's law: n = sin i ÷ sin r."),
    Q("Why mark the ray with two crosses far apart?", "It lets you draw the ray's direction more accurately", ["It makes the ray brighter", "So the block doesn't move", "To find the critical angle"], "Points far apart reduce the error in the line's direction."),
  ],
  lens: [
    Q("The lens formula is…", "1/f = 1/u + 1/v", ["f = u + v", "f = u × v", "1/f = 1/u − 1/v (always)"], "For a real image, 1/f = 1/u + 1/v."),
    Q("How do you get the most accurate image position?", "Move the screen both ways and find where the image is sharpest", ["Put the screen as close as possible", "Use a dimmer lamp", "Guess where the image should be"], "Finding the sharpest point narrows down v."),
    Q("Why do the experiment in a dimmed room?", "So the image on the screen is easier to see", ["So the lens doesn't get hot", "To make the focal length shorter", "So the object is smaller"], "Less background light makes the faint image clearer."),
  ],
  "heating-curve": [
    Q("Why does the temperature stay at 0 °C for a while?", "The energy is used to melt the ice (break bonds), not raise the temperature", ["The thermometer stopped working", "The ice is losing energy", "Ice can't get warmer"], "During a change of state the temperature is constant (latent heat)."),
    Q("Why use crushed ice and stir?", "So it heats evenly and the thermometer reads the true temperature", ["To make it melt more slowly", "So it boils at a lower temperature", "To keep the beaker clean"], "Even heating avoids hot spots."),
    Q("At sea level the flat part at the top is at…", "100 °C", ["0 °C", "50 °C", "120 °C"], "Pure water boils at 100 °C at standard pressure."),
  ],
  "specific-heat": [
    Q("Specific heat capacity is found from…", "c = E ÷ (m × Δθ)", ["c = m × Δθ ÷ E", "c = E × m", "c = Δθ ÷ E"], "E = m c Δθ, rearranged."),
    Q("Why wrap the block in insulation?", "To reduce energy lost to the surroundings", ["To make it heat faster than possible", "To protect the thermometer", "To keep it from melting"], "Less heat loss means less of an overestimate of c."),
    Q("The value of c you find is usually too big because…", "Some energy is lost to the air, so not all of it heats the block", ["The block is too light", "The heater gives too little energy", "Aluminium has no specific heat capacity"], "Energy lost is counted as supplied, but doesn't raise the temperature."),
  ],
  "free-fall": [
    Q("Why use an electronic timer rather than a stopwatch?", "It removes human reaction time", ["It is cheaper", "It makes the ball fall faster", "It measures the height too"], "The timer starts and stops automatically."),
    Q("A graph of h against t² gives a straight line. The gradient is…", "g ÷ 2", ["g", "2g", "1 ÷ g"], "h = ½ g t², so gradient = g/2."),
    Q("One of three drop times is much longer than the other two. The best action is…", "Leave it out as an anomaly and take the mean of the other two", ["Use the longest time", "Average all three", "Ignore all three"], "Anomalous readings are excluded from the mean."),
  ],
  waves: [
    Q("Why measure the length of 10 waves rather than one?", "It reduces the error in measuring one wavelength", ["The waves are faster", "It changes the frequency", "One wave can't be seen"], "Dividing a longer length by 10 gives a more accurate λ."),
    Q("The wave speed is…", "frequency × wavelength", ["frequency ÷ wavelength", "wavelength ÷ frequency", "frequency + wavelength"], "v = f λ."),
    Q("What lets you see the waves clearly in a ripple tank?", "A lamp above that casts their shadows on the floor or a screen", ["Colouring the water", "Turning off the motor", "Using deep water"], "The ripples act like lenses, giving bright and dark bands."),
  ],
  circuits: [
    Q("How is the ammeter connected?", "In series with the resistor", ["In parallel with the resistor", "Across the power supply only", "It isn't needed"], "An ammeter measures the current through a component, so it goes in line."),
    Q("Why switch off between readings?", "So the resistor doesn't heat up and change its resistance", ["To save the battery only", "To reset the meters to zero", "So the voltmeter can cool"], "A warm resistor has a higher resistance."),
    Q("A straight line through the origin for I against V means…", "Current is proportional to p.d., so the resistance is constant", ["The resistance increases", "The resistor is broken", "There is no current"], "That is Ohm's law."),
  ],
  projectile: [
    Q("Which launch angle gives the longest range (ignoring air resistance)?", "45°", ["30°", "60°", "90°"], "45° balances time in the air and horizontal speed."),
    Q("Why fire the ball several times at each angle?", "To find a mean range and spot any anomalous shot", ["To wear the spring in", "To make it go further", "So the angle changes"], "Repeats make the result more reliable."),
    Q("Which variable is the independent variable?", "The launch angle", ["The range", "The mass of the ball", "The spring"], "It's the one you choose to change."),
  ],
  "wire-resistance": [
    Q("How does resistance depend on the length of the wire?", "It is proportional to the length", ["It is inversely proportional", "It doesn't change", "It depends only on the current"], "Double the length, double the resistance."),
    Q("Why keep the p.d. low (2.0 V) and switch off between readings?", "So the wire doesn't heat up", ["To make the ammeter read higher", "To change the wire's thickness", "So the wire stretches"], "Heating raises resistance and spoils a fair test."),
    Q("Which must be kept the same for a fair test?", "The wire's material and thickness", ["The length", "The current", "The resistance"], "Only the length should change."),
  ],
  electromagnet: [
    Q("More turns of wire make the electromagnet…", "Stronger", ["Weaker", "No different", "Lose its magnetism"], "More turns, more magnetic field for the same current."),
    Q("What else must stay the same for a fair test?", "The current (the same power supply setting)", ["The number of turns", "The number of paperclips picked up", "The colour of the wire"], "Current also changes the strength, so it's a control variable."),
    Q("Why use an iron core?", "Iron is magnetically soft and strengthens the field", ["Iron conducts electricity better", "Iron stays magnetised for ever", "It keeps the wire cool"], "A soft iron core concentrates the field and loses it when switched off."),
  ],
  insulation: [
    Q("Which material insulated best?", "The one whose water cooled most slowly", ["The one that cooled fastest", "The bare beaker", "The heaviest one"], "Good insulators reduce the rate of heat loss."),
    Q("What must be the same in each beaker for a fair test?", "The volume and starting temperature of the water", ["The insulating material", "The final temperature", "The time each was left"], "Only the insulation should differ."),
    Q("Why does cotton wool insulate well?", "It traps air, a poor conductor", ["It is white", "It absorbs water", "It is heavier than newspaper"], "Trapped air reduces conduction and convection."),
  ],
  "terminal-velocity": [
    Q("Why start timing below the first band, not at the surface?", "The ball needs time to reach terminal velocity", ["The oil is thicker at the top", "So the ball goes faster", "The bands are easier to see"], "It accelerates at first, then travels at a steady speed."),
    Q("At terminal velocity the forces on the ball are…", "Balanced: weight = drag + upthrust", ["Unbalanced", "Weight only", "Zero weight"], "No resultant force means no acceleration."),
    Q("Equal times between equally spaced bands show…", "The ball is moving at a constant speed", ["The ball is accelerating", "The oil is getting thicker", "The ball has stopped"], "Same distance in the same time means constant velocity."),
  ],
  // ── Chemistry ──
  titration: [
    Q("Why stand the flask on a white tile?", "So the colour change at the end point is easy to see", ["To keep the flask cool", "To stop the flask slipping", "It makes the reaction faster"], "The white background shows the faint colour change."),
    Q("Concordant titres are…", "Titres within 0.10 cm³ of each other", ["The first and last titres", "Titres that are exactly 25.00 cm³", "Any two titres"], "Use the mean of concordant titres only."),
    Q("Why add the acid drop by drop near the end point?", "So you don't overshoot the end point", ["To make the indicator work", "To keep the burette full", "So the acid doesn't evaporate"], "One extra drop can be the whole difference."),
  ],
  rates: [
    Q("Why use the same paper cross and look from the same height each time?", "So the end point is judged the same way in every run", ["To make the reaction faster", "To change the concentration", "So less sulfur forms"], "Keeping the judgement the same makes it a fair test."),
    Q("Which variable did you change?", "The concentration of sodium thiosulfate", ["The volume of acid", "The temperature", "The size of the cross"], "Total volume stayed 50 cm³; only the thiosulfate/water ratio changed."),
    Q("Why does a higher concentration react faster?", "There are more particles in the same volume, so more frequent collisions", ["The particles are bigger", "The particles have more energy", "The flask is hotter"], "More frequent successful collisions mean a faster rate."),
  ],
  reactivity: [
    Q("Which observation shows the most reactive metal?", "The fastest bubbling", ["No bubbles", "The metal sinks", "The acid stays clear"], "More reactive metals react faster with acid."),
    Q("Why use the same size piece of each metal and the same acid?", "So it's a fair test — only the metal changes", ["To save money", "To make all the metals react", "So the acid gets hotter"], "Surface area and concentration also affect the rate."),
    Q("What gas is given off when a metal reacts with dilute acid?", "Hydrogen", ["Oxygen", "Carbon dioxide", "Chlorine"], "Metal + acid → salt + hydrogen."),
  ],
  "gas-laws": [
    Q("Boyle's law says that for a fixed mass of gas at constant temperature…", "pressure × volume is constant", ["pressure ÷ volume is constant", "pressure + volume is constant", "volume doesn't change"], "p V = constant."),
    Q("Why wait a little after each pump before reading?", "So the air returns to room temperature", ["So the gas leaks out", "To let the oil rise faster", "It isn't needed"], "Compressing warms the gas; temperature must be constant."),
    Q("Doubling the pressure on the air makes its volume…", "Halve", ["Double", "Stay the same", "Fall to a quarter"], "p ∝ 1/V."),
  ],
  electrolysis: [
    Q("Why wash the cathode with water then propanone and dry it before weighing?", "So only the mass of copper is measured, not liquid", ["To make the copper react", "To cool it", "To remove the copper"], "Any solution or water left on it would add mass."),
    Q("What happens at the cathode?", "Copper ions gain electrons and copper is deposited", ["Copper dissolves into the solution", "Oxygen bubbles off", "Nothing"], "Cu²⁺ + 2e⁻ → Cu."),
    Q("Doubling the time at the same current should make the mass of copper…", "Double", ["Halve", "Stay the same", "Fall to zero"], "Mass deposited is proportional to charge passed (current × time)."),
  ],
  chromatography: [
    Q("Why draw the start line in pencil, not ink?", "Pencil doesn't dissolve and run up the paper", ["Pencil is darker", "Ink is too expensive", "So the line is easy to rub out"], "Graphite is insoluble in the solvent."),
    Q("Rf is…", "distance moved by the spot ÷ distance moved by the solvent", ["distance moved by the solvent ÷ distance moved by the spot", "the height of the spot", "the number of spots"], "Rf is always less than 1."),
    Q("Why must the start line be above the solvent level?", "So the inks don't just dissolve into the solvent in the beaker", ["So the paper stays dry", "To make the solvent move faster", "It doesn't matter"], "Below the solvent, the spots would wash off the paper."),
  ],
  "flame-tests": [
    Q("Why clean the wire loop in acid and hold it in the flame first?", "To remove traces of other salts that would colour the flame", ["To heat the acid", "To make the wire longer", "To change the flame colour on purpose"], "Contamination gives misleading colours."),
    Q("A lilac flame shows…", "Potassium ions", ["Sodium ions", "Copper ions", "Lithium ions"], "K⁺: lilac; Na⁺: yellow; Li⁺: crimson; Cu²⁺: blue-green."),
    Q("Why use a blue (roaring) flame?", "It is hot and almost colourless, so the salt's colour shows clearly", ["A yellow flame is too hot", "It makes the wire glow", "It is safer than a yellow flame"], "A yellow flame would hide the colour."),
  ],
  "ph-indicators": [
    Q("A pH of 2 means the solution is…", "Strongly acidic", ["Neutral", "Weakly alkaline", "Strongly alkaline"], "pH below 7 is acidic; the lower, the stronger."),
    Q("Why rinse the pH probe with distilled water between solutions?", "So one solution doesn't contaminate the next reading", ["To calibrate it to pH 14", "To make it read faster", "So it stays cold"], "Left-over solution would change the next pH."),
    Q("Why is a pH meter better than universal indicator?", "It gives a more precise value (to 0.1 or better)", ["It changes colour", "It works without a solution", "It is always cheaper"], "Indicator colours only give whole numbers."),
  ],
  neutralisation: [
    Q("Why use a polystyrene cup?", "It is a good insulator, so less heat is lost", ["It reacts with the acid", "It is easy to see through", "It makes the reaction faster"], "Less heat loss gives a more accurate temperature rise."),
    Q("Why does the temperature fall after the neutral point?", "No more reaction happens; adding cooler alkali cools the mixture", ["The reaction becomes endothermic", "The thermometer is broken", "The acid evaporates"], "Excess NaOH at room temperature dilutes and cools the mixture."),
    Q("How is the neutralisation volume found from the graph?", "Where the two best-fit lines meet", ["At the first reading", "At the lowest temperature", "At 25 cm³ every time"], "The peak of the extrapolated lines marks complete neutralisation."),
  ],
  salts: [
    Q("Why add copper(II) oxide until no more dissolves?", "To make sure all the acid is used up", ["To make the solution colourless", "To speed up evaporation", "To make more acid"], "Excess base means no acid is left in the salt solution."),
    Q("How is the excess copper oxide removed?", "Filtration", ["Evaporation", "Distillation", "Chromatography"], "The solid stays in the filter paper."),
    Q("Why heat the solution only until crystals start to form, then leave it to cool?", "To get bigger, well-formed crystals that keep their water of crystallisation", ["To get a powder faster", "So the solution boils away completely", "To remove the copper"], "Slow cooling gives good crystals; boiling dry gives a powder."),
  ],
  "gas-syringe": [
    Q("Why does powdered marble react faster than chips?", "It has a bigger surface area, so more collisions", ["Powder is more concentrated", "Powder is hotter", "Chips don't react"], "More exposed particles means more frequent collisions."),
    Q("Why do the two curves end at the same volume?", "The same mass of marble and acid gives the same amount of CO₂", ["The syringe is full", "The powder stops reacting", "They don't — powder gives more gas"], "The total amount of gas depends on the amounts reacting, not the rate."),
    Q("A gas syringe is better than counting bubbles because…", "It measures the actual volume of gas", ["It is quieter", "It makes the reaction faster", "It removes the gas"], "Bubbles vary in size; volume is precise."),
  ],
  "ion-tests": [
    Q("Adding sodium hydroxide gives a blue precipitate. The ion is…", "Cu²⁺", ["Fe²⁺", "Fe³⁺", "Na⁺"], "Cu²⁺: blue; Fe²⁺: green; Fe³⁺: orange-brown."),
    Q("Why add dilute nitric acid before silver nitrate?", "To remove carbonate ions, which would also give a precipitate", ["To make the precipitate dissolve", "To colour the solution", "To speed up the reaction"], "Carbonates would give a false positive."),
    Q("A yellow precipitate with silver nitrate shows…", "Iodide", ["Chloride", "Bromide", "Sulfate"], "Cl⁻: white; Br⁻: cream; I⁻: yellow."),
  ],
  // ── Biology ──
  photosynthesis: [
    Q("Why put a beaker of water between the lamp and the pondweed?", "To absorb heat, so the temperature stays the same", ["To give the plant more water", "To make the light brighter", "To collect the oxygen"], "Temperature is a control variable."),
    Q("Moving the lamp further away makes the bubbling…", "Slower", ["Faster", "Stop at once", "No different"], "Light intensity falls with distance, so photosynthesis slows."),
    Q("Why leave the pondweed a few minutes after moving the lamp?", "To let it adjust to the new light intensity", ["To let it grow", "To warm the water", "To use up the carbon dioxide"], "The rate needs time to settle before counting."),
  ],
  enzymes: [
    Q("Why test with iodine every 30 seconds?", "To find when all the starch has been broken down", ["To stop the enzyme working", "To feed the enzyme", "To keep the pH constant"], "Iodine stays orange when no starch is left."),
    Q("Why does amylase stop working at 80 °C?", "It is denatured — its active site changes shape", ["It is killed", "It works too fast to see", "Starch melts"], "Enzymes are proteins; high temperature changes their shape."),
    Q("Why keep the amylase and starch at the test temperature before mixing?", "So the reaction starts at the right temperature", ["To kill bacteria", "To make more starch", "To change the pH"], "Otherwise the first part of the reaction happens at the wrong temperature."),
  ],
  transpiration: [
    Q("Why cut the shoot and fit it to the potometer under water?", "To stop air entering the xylem", ["To clean the leaves", "To make it heavier", "To slow transpiration"], "An air lock would break the water column."),
    Q("Moving air (a fan) makes the bubble move…", "Faster", ["Slower", "Backwards", "Not at all"], "Wind carries water vapour away from the leaf."),
    Q("A potometer really measures…", "Water uptake by the shoot", ["Water lost by the leaves exactly", "Photosynthesis", "Oxygen production"], "Some water taken up is used by the plant, not lost."),
  ],
  cells: [
    Q("Why stain onion cells with iodine?", "To make the nucleus and cell wall easier to see", ["To kill the cells", "To make them grow", "To magnify them"], "The stain adds contrast to colourless parts."),
    Q("Why lower the coverslip at an angle?", "To avoid trapping air bubbles", ["To make the cells bigger", "To press the cells flat", "So it doesn't break"], "Bubbles look like cells and hide detail."),
    Q("Which objective should you focus with first?", "The lowest power", ["The highest power", "Any of them", "None — use the eyepiece"], "Low power gives the widest view and avoids crashing into the slide."),
  ],
  genetics: [
    Q("Bb × Bb gives offspring in the ratio…", "3 brown : 1 blue", ["1 brown : 1 blue", "All brown", "1 brown : 3 blue"], "BB, Bb, Bb (brown) and bb (blue)."),
    Q("Why put each bead back after drawing it?", "So the chance of drawing B or b stays the same", ["To save beads", "To make blue more likely", "It doesn't matter"], "Each gamete is B or b with probability ½."),
    Q("Why might your results not be exactly 3 : 1?", "Chance — each draw is random, and the sample is small", ["The Punnett square is wrong", "Brown is recessive", "Beads change colour"], "Bigger samples get closer to the expected ratio."),
  ],
  "heart-rate": [
    Q("Why count the pulse for 15 seconds and multiply by 4?", "It gives beats per minute quickly, before the rate changes much", ["15 seconds is more accurate than 60", "The heart only beats for 15 seconds", "To make the number bigger"], "Heart rate changes quickly after exercise."),
    Q("Why does heart rate rise during exercise?", "To deliver more oxygen and glucose to the muscles for respiration", ["To cool the body", "To make you breathe slower", "Because blood gets thicker"], "Muscles respire faster when they work."),
    Q("A fitter person's heart rate…", "Returns to resting more quickly", ["Stays high for longer", "Never rises", "Is always above 150 bpm"], "Recovery time is a measure of fitness."),
  ],
  yeast: [
    Q("Why does the yeast give off bubbles?", "It respires and makes carbon dioxide", ["It photosynthesises and makes oxygen", "The glucose boils", "It makes hydrogen"], "Glucose → ethanol + carbon dioxide (anaerobic)."),
    Q("Why does bubbling slow down at very high temperature?", "The yeast's enzymes are denatured", ["There's too much glucose", "The yeast grows too big", "The water evaporates"], "Above the optimum, enzymes lose their shape."),
    Q("Why leave each tube a few minutes before counting?", "So the yeast reaches the water bath's temperature", ["To use up the glucose", "To let the bubbles get bigger", "To kill the yeast"], "The respiration rate needs to settle at the new temperature."),
  ],
  "leaf-starch": [
    Q("Why boil the leaf in water first?", "To kill it and break down the cell membranes so iodine can get in", ["To remove the starch", "To make it green", "To make it photosynthesise"], "It also stops chemical reactions in the leaf."),
    Q("Why warm the leaf in ethanol (in a water bath, no flame)?", "To remove the chlorophyll so the colour change can be seen", ["To add starch", "To soften the iodine", "To make it photosynthesise faster"], "Ethanol is flammable, so it's heated in hot water, never over a flame."),
    Q("Only the green parts turned blue-black. This shows…", "Chlorophyll is needed for photosynthesis", ["The white parts have more starch", "Light isn't needed", "Iodine only stains green things"], "Starch is made only where there is chlorophyll."),
  ],
  quadrats: [
    Q("Why place the quadrats at random?", "To avoid bias in choosing where to sample", ["To find the most daisies", "So they're all in a line", "To save time"], "Random sampling gives a fair estimate."),
    Q("The estimate for the field is…", "mean daisies per quadrat × area of the field", ["total counted × 5", "mean per quadrat only", "number of quadrats × area"], "Scale up from 1 m² to the whole area."),
    Q("How could you make the estimate more reliable?", "Use more quadrats", ["Use fewer quadrats", "Only sample where there are daisies", "Count the daisies twice in one quadrat"], "A bigger sample gives a more reliable mean."),
  ],
  "reaction-time": [
    Q("Why should your partner drop the ruler without warning?", "So you react to it and can't predict when it falls", ["To make it fall faster", "So you can catch it sooner", "It doesn't matter"], "Anticipation would give a false, short time."),
    Q("One catch was much further down the ruler than the others. What should you do?", "Treat it as anomalous, leave it out and average the rest", ["Average all of them", "Use only that one", "Give up the experiment"], "An anomaly (you blinked) would distort the mean."),
    Q("Which variable must be kept the same?", "The starting position of your fingers (level with 0)", ["The distance the ruler falls", "Your reaction time", "Which hand you use"], "Starting at 0 makes every distance comparable."),
  ],
  "food-tests": [
    Q("Benedict's reagent turns brick-red with…", "Reducing sugar (when heated)", ["Starch", "Protein", "Fat"], "A positive Benedict's test needs heating to about 80 °C."),
    Q("Iodine solution turns blue-black with…", "Starch", ["Glucose", "Protein", "Water"], "Iodine stays orange-brown with no starch."),
    Q("Biuret reagent turns purple with…", "Protein", ["Starch", "Reducing sugar", "Fat"], "Blue turns lilac/purple when protein is present."),
  ],
  osmosis: [
    Q("Why blot the potato cylinders dry before weighing?", "To remove surface water, so only the potato's mass is measured", ["To stop osmosis", "To make them lighter on purpose", "To dry out the cells"], "Surface water would add mass."),
    Q("Why use percentage change in mass, not change in mass?", "The cylinders started with different masses", ["It's always bigger", "So it's never negative", "Balances only read percentages"], "Percentage change lets you compare them fairly."),
    Q("Potato in pure water gains mass because…", "Water moves into the cells by osmosis, from a dilute to a more concentrated solution", ["Sugar moves into the potato", "The potato grows", "Water evaporates"], "Water moves across the partially permeable membrane."),
  ],
};

export const examFor = (slug: string): ExamQ[] => EXAM[slug] ?? [];
