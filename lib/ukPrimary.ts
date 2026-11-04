// Ready-made quizzes and games for early years and primary, following the
// England curriculum: the EYFS (Reception) Early Learning Goals and the
// National Curriculum for Key Stage 1 (Years 1–2) and Key Stage 2 (Years 3–6).
//
// Each set works two ways on the board: as a live quiz (Kahoot-style, on
// everyone's phone) or as a class game (the arcade "choice" game).
//
// Answers are written as the text of the right option (checked by
// tests/unit/ukPrimary.test.ts), so an answer can never point at the wrong one.

export type UKStage = "eyfs" | "ks1" | "ks2" | "sss";
export type UKSubject = "Maths" | "English" | "Science";
export const UK_STAGE_LABEL: Record<UKStage, string> = { eyfs: "Early years (EYFS)", ks1: "Key Stage 1", ks2: "Key Stage 2", sss: "SSS · WAEC" };
export const UK_YEARS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "SSS 1", "SSS 2", "SSS 3"] as const;
export type UKYear = (typeof UK_YEARS)[number];

type RawQ = { q: string; options: string[]; answer: string };
export type UKSet = {
  id: string; title: string; stage: UKStage; year: UKYear; subject: UKSubject;
  topic: string;  // the curriculum strand it covers
  emoji: string;
  questions: RawQ[];
};

// Seconds per question for a live quiz: longer for younger children.
// SSS (WAEC) questions need working out with a calculator: a minute each.
export const secondsFor = (s: Pick<UKSet, "stage">) => (s.stage === "sss" ? 60 : s.stage === "ks2" ? 20 : 30);

const stageOf = (year: UKYear): UKStage => (year === "Reception" ? "eyfs" : year === "Year 1" || year === "Year 2" ? "ks1" : year.startsWith("SSS") ? "sss" : "ks2");
const set = (id: string, year: UKYear, subject: UKSubject, title: string, topic: string, emoji: string, questions: RawQ[]): UKSet =>
  ({ id, title, stage: stageOf(year), year, subject, topic, emoji, questions });
const Q = (q: string, answer: string, ...others: string[]): RawQ => {
  // Mix the right answer in among the others, in a fixed (not random) place.
  const options = [...others];
  const at = (q.length + answer.length) % (others.length + 1);
  options.splice(at, 0, answer);
  return { q, options, answer };
};

export const UK_SETS: UKSet[] = [
  // ── Reception (EYFS) ──────────────────────────────────────────────────────
  set("eyfs-count-10", "Reception", "Maths", "Count to 10", "Number: counting", "🍎", [
    Q("How many apples? 🍎🍎🍎", "3", "2", "4", "5"),
    Q("How many stars? ⭐⭐⭐⭐⭐", "5", "4", "6", "3"),
    Q("How many ducks? 🦆🦆", "2", "1", "3", "4"),
    Q("How many balloons? 🎈🎈🎈🎈🎈🎈🎈", "7", "6", "8", "9"),
    Q("How many fish? 🐟🐟🐟🐟", "4", "3", "5", "6"),
    Q("Which number comes after 6?", "7", "5", "8", "9"),
    Q("Which number comes before 10?", "9", "8", "11", "7"),
    Q("How many cars? 🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗", "10", "9", "8", "11"),
  ]),
  set("eyfs-more-less", "Reception", "Maths", "One more, one less", "Number: more and less", "➕", [
    Q("What is one more than 4?", "5", "3", "6", "4"),
    Q("What is one less than 7?", "6", "8", "5", "7"),
    Q("🐶🐶🐶 and one more dog. How many dogs now?", "4", "3", "5", "2"),
    Q("🍪🍪🍪🍪🍪 — you eat one. How many cookies are left?", "4", "5", "3", "6"),
    Q("What is one more than 9?", "10", "8", "11", "9"),
    Q("What is one less than 1?", "0", "2", "1", "10"),
    Q("Which is more: 3 or 8?", "8", "3"),
    Q("Which is fewer: 🍌🍌 or 🍌🍌🍌🍌?", "🍌🍌", "🍌🍌🍌🍌"),
  ]),
  set("eyfs-shapes", "Reception", "Maths", "Shapes all around", "Shape, space and measure", "🔺", [
    Q("Which shape has 3 sides?", "Triangle", "Square", "Circle", "Rectangle"),
    Q("Which shape is round with no corners?", "Circle", "Triangle", "Square", "Star"),
    Q("How many sides does a square have?", "4", "3", "5", "6"),
    Q("What shape is this? 🟦", "Square", "Circle", "Triangle", "Oval"),
    Q("A ball is shaped like a…", "Sphere", "Cube", "Cone", "Cylinder"),
    Q("What comes next? 🔴🔵🔴🔵🔴 …", "🔵", "🔴", "🟢", "🟡"),
    Q("What comes next? 🐱🐶🐶🐱🐶🐶🐱 …", "🐶", "🐱", "🐭", "🐰"),
    Q("Which is the longest? 🐍 or 🐛", "🐍", "🐛"),
  ]),
  set("eyfs-first-sounds", "Reception", "English", "First sounds", "Phonics: Phase 2 sounds", "🔤", [
    Q("Which word starts with the sound s? 🐍", "sun", "map", "dog", "pin"),
    Q("Which word starts with the sound m? 🌙", "moon", "cat", "hat", "sock"),
    Q("Which word starts with the sound t? 🐯", "tiger", "pig", "net", "bat"),
    Q("What sound does cat start with? 🐱", "c", "a", "t", "s"),
    Q("What sound does dog start with? 🐶", "d", "o", "g", "b"),
    Q("Which word rhymes with cat?", "hat", "dog", "sun", "pen"),
    Q("Which word rhymes with pig?", "wig", "pen", "cup", "map"),
    Q("Blend the sounds: s – a – t", "sat", "sit", "set", "tap"),
  ]),

  // ── Year 1 ────────────────────────────────────────────────────────────────
  set("y1-bonds-10", "Year 1", "Maths", "Number bonds to 10", "Addition and subtraction", "🔟", [
    Q("6 + ? = 10", "4", "3", "5", "6"),
    Q("2 + ? = 10", "8", "7", "9", "6"),
    Q("? + 5 = 10", "5", "4", "6", "10"),
    Q("10 − 3 =", "7", "6", "8", "13"),
    Q("9 + 1 =", "10", "8", "11", "9"),
    Q("Which pair makes 10?", "3 and 7", "4 and 5", "2 and 7", "6 and 3"),
    Q("10 − 10 =", "0", "10", "1", "20"),
    Q("7 + 3 =", "10", "9", "11", "4"),
    Q("? + 1 = 10", "9", "8", "10", "11"),
  ]),
  set("y1-within-20", "Year 1", "Maths", "Add and subtract within 20", "Addition and subtraction", "🧮", [
    Q("8 + 5 =", "13", "12", "14", "3"),
    Q("15 − 4 =", "11", "10", "12", "19"),
    Q("9 + 9 =", "18", "17", "19", "16"),
    Q("20 − 7 =", "13", "12", "14", "27"),
    Q("12 + 6 =", "18", "16", "17", "19"),
    Q("17 − 9 =", "8", "7", "9", "6"),
    Q("Double 6 is…", "12", "8", "16", "6"),
    Q("Half of 14 is…", "7", "6", "8", "4"),
  ]),
  set("y1-digraphs", "Year 1", "English", "sh, ch, th and ng", "Phonics: Phase 3 digraphs", "🗣️", [
    Q("Which word has the sh sound? 🐟", "fish", "chip", "ring", "thin"),
    Q("Which word has the ch sound? 🧀", "cheese", "shop", "song", "moth"),
    Q("Which word ends in ng? 💍", "ring", "rich", "rash", "rat"),
    Q("Which word starts with th?", "thumb", "shut", "chin", "sing"),
    Q("Choose the right spelling: 🐑", "sheep", "cheep", "seep", "theep"),
    Q("Choose the right spelling: 🐔", "chick", "shick", "thick", "kick"),
    Q("How many sounds in 'ship'? (sh-i-p)", "3", "4", "2", "5"),
    Q("Which is a real word?", "much", "mush-ch", "chum-sh", "thng"),
  ]),
  set("y1-animals", "Year 1", "Science", "Animals, including humans", "Animals including humans", "🦁", [
    Q("Which animal is a mammal?", "Dog", "Shark", "Eagle", "Frog"),
    Q("Which animal is a bird?", "Robin", "Bat", "Snake", "Cat"),
    Q("Which animal is a fish?", "Goldfish", "Dolphin", "Penguin", "Crab"),
    Q("An animal that eats only plants is a…", "Herbivore", "Carnivore", "Omnivore", "Predator"),
    Q("A lion eats meat. It is a…", "Carnivore", "Herbivore", "Plant", "Amphibian"),
    Q("Which part of your body do you use to smell?", "Nose", "Ears", "Elbow", "Knee"),
    Q("How many senses do humans have?", "5", "3", "4", "10"),
    Q("A frog is an…", "Amphibian", "Insect", "Bird", "Mammal"),
  ]),
  set("y1-time", "Year 1", "Maths", "Days, months and o'clock", "Measurement: time", "🕒", [
    Q("Which day comes after Monday?", "Tuesday", "Sunday", "Wednesday", "Friday"),
    Q("How many days are in a week?", "7", "5", "10", "12"),
    Q("Which month comes after March?", "April", "May", "February", "June"),
    Q("The big hand is on 12 and the little hand is on 3. What time is it?", "3 o'clock", "12 o'clock", "half past 3", "6 o'clock"),
    Q("How many months are in a year?", "12", "10", "7", "52"),
    Q("Which comes first in the day?", "Morning", "Evening", "Night", "Afternoon"),
    Q("The day before Saturday is…", "Friday", "Sunday", "Thursday", "Monday"),
    Q("Which is longer?", "A week", "A day", "An hour", "A minute"),
  ]),

  // ── Year 2 ────────────────────────────────────────────────────────────────
  set("y2-place-value", "Year 2", "Maths", "Tens and ones", "Number and place value", "🔢", [
    Q("How many tens are in 47?", "4", "7", "40", "11"),
    Q("What is the value of the 6 in 63?", "60", "6", "3", "600"),
    Q("3 tens and 5 ones is…", "35", "53", "8", "305"),
    Q("Which number is the greatest?", "71", "17", "69", "58"),
    Q("What is 10 more than 48?", "58", "49", "38", "148"),
    Q("What is 10 less than 90?", "80", "89", "70", "100"),
    Q("Put in order, smallest first: 52, 25, 40", "25, 40, 52", "52, 40, 25", "40, 25, 52", "25, 52, 40"),
    Q("Write seventy-two in numerals", "72", "27", "702", "7020"),
  ]),
  set("y2-tables-2-5-10", "Year 2", "Maths", "2, 5 and 10 times tables", "Multiplication and division", "✖️", [
    Q("2 × 6 =", "12", "8", "14", "10"),
    Q("5 × 7 =", "35", "30", "40", "12"),
    Q("10 × 9 =", "90", "19", "80", "100"),
    Q("5 × 4 =", "20", "9", "25", "15"),
    Q("2 × 11 =", "22", "13", "21", "24"),
    Q("30 ÷ 10 =", "3", "20", "300", "10"),
    Q("25 ÷ 5 =", "5", "20", "4", "6"),
    Q("16 ÷ 2 =", "8", "14", "6", "32"),
    Q("Which number is in the 5 times table?", "45", "42", "33", "18"),
  ]),
  set("y2-fractions", "Year 2", "Maths", "Halves, quarters and thirds", "Fractions", "🍕", [
    Q("What is ½ of 10?", "5", "2", "8", "20"),
    Q("What is ¼ of 12?", "3", "4", "6", "8"),
    Q("What is ⅓ of 9?", "3", "6", "9", "27"),
    Q("A pizza is cut into 4 equal slices. One slice is…", "¼", "½", "⅓", "¾"),
    Q("Which is the same as ½?", "2/4", "1/3", "1/4", "3/4"),
    Q("What is ¾ of 8?", "6", "4", "2", "3"),
    Q("A shape has 2 equal parts. Each part is…", "a half", "a quarter", "a third", "a whole"),
    Q("What is ½ of 20?", "10", "5", "15", "40"),
  ]),
  set("y2-money", "Year 2", "Maths", "Pounds and pence", "Measurement: money", "💷", [
    Q("How many pence are in £1?", "100p", "10p", "50p", "1000p"),
    Q("20p + 20p + 10p =", "50p", "40p", "60p", "30p"),
    Q("Which coin is worth the most?", "£2", "50p", "£1", "20p"),
    Q("A pencil costs 35p. You pay with 50p. What change do you get?", "15p", "25p", "5p", "85p"),
    Q("£1 and 50p is…", "£1.50", "£1.05", "£150", "51p"),
    Q("Which two coins make 30p?", "20p and 10p", "10p and 10p", "20p and 5p", "50p and 20p"),
    Q("What is 5p + 2p + 1p?", "8p", "7p", "9p", "6p"),
    Q("You have £2. A toy costs £1.20. How much is left?", "80p", "£1", "20p", "£3.20"),
  ]),
  set("y2-word-classes", "Year 2", "English", "Nouns, verbs and adjectives", "Grammar: word classes", "📝", [
    Q("Which word is a noun?", "table", "run", "happy", "quickly"),
    Q("Which word is a verb?", "jump", "blue", "chair", "soft"),
    Q("Which word is an adjective?", "fluffy", "sing", "teacher", "slowly"),
    Q("Find the verb: 'The dog barked loudly.'", "barked", "dog", "loudly", "The"),
    Q("Find the adjective: 'She has a red coat.'", "red", "coat", "has", "She"),
    Q("Which sentence needs a question mark?", "Where is my hat", "I like cake", "The sun is hot", "Sit down"),
    Q("Which word needs a capital letter?", "london", "chair", "apple", "happy"),
    Q("Join the sentences: 'I like tea ___ I like cake.'", "and", "but", "or", "so"),
  ]),
  set("y2-living-habitats", "Year 2", "Science", "Living things and habitats", "Living things and their habitats", "🌳", [
    Q("Which of these is living?", "A tree", "A rock", "A chair", "A spoon"),
    Q("A polar bear's habitat is the…", "Arctic", "Desert", "Rainforest", "Pond"),
    Q("What do plants need to grow?", "Water and light", "Sweets", "Darkness only", "Salt"),
    Q("A camel lives in the…", "Desert", "Ocean", "Arctic", "Pond"),
    Q("Grass → rabbit → fox. What does the rabbit eat?", "Grass", "Fox", "Rabbit", "Nothing"),
    Q("Which is a micro-habitat?", "Under a log", "The ocean", "A city", "A desert"),
    Q("Which was once alive?", "A wooden table", "A metal spoon", "A glass bottle", "A plastic cup"),
    Q("A tadpole grows into a…", "Frog", "Fish", "Butterfly", "Bird"),
  ]),

  // ── Year 3 ────────────────────────────────────────────────────────────────
  set("y3-tables-3-4-8", "Year 3", "Maths", "3, 4 and 8 times tables", "Multiplication and division", "🎯", [
    Q("3 × 7 =", "21", "24", "18", "10"),
    Q("4 × 6 =", "24", "20", "28", "10"),
    Q("8 × 8 =", "64", "56", "72", "16"),
    Q("8 × 4 =", "32", "28", "36", "12"),
    Q("3 × 12 =", "36", "33", "39", "15"),
    Q("40 ÷ 8 =", "5", "4", "6", "32"),
    Q("27 ÷ 3 =", "9", "8", "7", "24"),
    Q("44 ÷ 4 =", "11", "10", "12", "40"),
    Q("Which number is in the 8 times table?", "56", "54", "60", "46"),
  ]),
  set("y3-add-sub", "Year 3", "Maths", "Adding and subtracting 3-digit numbers", "Addition and subtraction", "➗", [
    Q("245 + 132 =", "377", "367", "387", "113"),
    Q("568 − 243 =", "325", "335", "315", "811"),
    Q("400 + 90 + 6 =", "496", "4906", "469", "946"),
    Q("What is 100 more than 732?", "832", "742", "733", "632"),
    Q("509 − 10 =", "499", "409", "519", "500"),
    Q("356 + 200 =", "556", "376", "358", "536"),
    Q("What is the value of the 4 in 482?", "400", "40", "4", "482"),
    Q("700 − 250 =", "450", "550", "500", "350"),
  ]),
  set("y3-word-families", "Year 3", "English", "Prefixes and word families", "Spelling and vocabulary", "🧩", [
    Q("Add a prefix to make the opposite of 'happy'", "unhappy", "dishappy", "inhappy", "mishappy"),
    Q("Add a prefix to make the opposite of 'appear'", "disappear", "unappear", "reappear", "misappear"),
    Q("'Re' at the start of a word means…", "again", "not", "before", "under"),
    Q("Which word is in the same family as 'solve'?", "solution", "solid", "soft", "sole"),
    Q("Which word means 'to behave badly'?", "misbehave", "rebehave", "unbehave", "inbehave"),
    Q("Which is correct?", "an apple", "a apple", "an banana", "a orange"),
    Q("Choose the correct conjunction: 'I wore a coat ___ it was cold.'", "because", "but", "or", "although"),
    Q("Which word is a preposition?", "under", "jumped", "green", "Tom"),
  ]),
  set("y3-light-magnets", "Year 3", "Science", "Light, rocks and magnets", "Light · Rocks · Forces and magnets", "🧲", [
    Q("We need light to…", "see things", "hear things", "smell things", "taste things"),
    Q("A shadow forms when light is…", "blocked", "reflected", "bent", "switched on"),
    Q("Which object will a magnet attract?", "Iron nail", "Plastic ruler", "Wooden spoon", "Paper"),
    Q("Two north poles of magnets will…", "repel", "attract", "melt", "glow"),
    Q("Which surface reflects light best?", "A mirror", "Black paper", "A towel", "Soil"),
    Q("Rocks made from cooled lava are…", "igneous", "sedimentary", "metamorphic", "plastic"),
    Q("A fossil is…", "the remains of something that lived long ago", "a type of crystal", "a living plant", "a kind of soil"),
    Q("Why must you never look straight at the Sun?", "It can damage your eyes", "It is too far away", "It is cold", "It is a planet"),
  ]),

  // ── Year 4 ────────────────────────────────────────────────────────────────
  set("y4-mtc", "Year 4", "Maths", "Multiplication check (to 12 × 12)", "Multiplication tables check", "⚡", [
    Q("7 × 8 =", "56", "54", "63", "48"),
    Q("6 × 9 =", "54", "56", "48", "63"),
    Q("12 × 11 =", "132", "121", "122", "144"),
    Q("9 × 7 =", "63", "56", "72", "64"),
    Q("11 × 6 =", "66", "61", "60", "77"),
    Q("12 × 12 =", "144", "124", "142", "132"),
    Q("8 × 6 =", "48", "42", "54", "46"),
    Q("7 × 7 =", "49", "47", "42", "56"),
    Q("9 × 12 =", "108", "98", "118", "102"),
    Q("6 × 7 =", "42", "36", "48", "43"),
  ]),
  set("y4-roman", "Year 4", "Maths", "Roman numerals", "Number and place value", "🏛️", [
    Q("What is IV?", "4", "6", "5", "3"),
    Q("What is IX?", "9", "11", "10", "8"),
    Q("What is XII?", "12", "7", "21", "13"),
    Q("What is XL?", "40", "60", "50", "15"),
    Q("What is C?", "100", "50", "1000", "500"),
    Q("Write 19 in Roman numerals", "XIX", "IXX", "XVIIII", "IXI"),
    Q("What is LXX?", "70", "30", "55", "120"),
    Q("What is XC?", "90", "110", "60", "40"),
  ]),
  set("y4-matter-sound", "Year 4", "Science", "States of matter and sound", "States of matter · Sound · Electricity", "💧", [
    Q("Water turning into ice is called…", "freezing", "melting", "evaporating", "condensing"),
    Q("Water boils at…", "100°C", "0°C", "50°C", "10°C"),
    Q("Which is a gas?", "Steam", "Ice", "Wood", "Milk"),
    Q("Sounds are made by things…", "vibrating", "shining", "melting", "floating"),
    Q("A sound gets quieter as you move…", "further away", "closer", "faster", "higher"),
    Q("Water droplets forming on a cold window is…", "condensation", "evaporation", "melting", "freezing"),
    Q("Which material is an electrical conductor?", "Copper", "Plastic", "Rubber", "Wood"),
    Q("For a bulb to light, the circuit must be…", "complete", "broken", "wet", "cold"),
  ]),
  set("y4-apostrophes", "Year 4", "English", "Apostrophes and fronted adverbials", "Grammar and punctuation", "✍️", [
    Q("One dog owns a bone. Which is correct?", "the dog's bone", "the dogs' bone", "the dogs bone", "the do'gs bone"),
    Q("'do not' shortened is…", "don't", "do'nt", "dont'", "dont"),
    Q("Which shows the toys belong to the girls (more than one)?", "the girls' toys", "the girl's toys", "the girls toy's", "the girls's toys"),
    Q("Which is a fronted adverbial?", "Later that day, we went home.", "We went home later.", "We went home.", "Home we went later."),
    Q("After a fronted adverbial you need a…", "comma", "full stop", "question mark", "colon"),
    Q("Which is a pronoun?", "she", "girl", "Anna", "happy"),
    Q("'It is' shortened is…", "it's", "its", "its'", "i'ts"),
    Q("Which sentence is in the past tense?", "We played football.", "We play football.", "We will play football.", "We are playing football."),
  ]),

  // ── Year 5 ────────────────────────────────────────────────────────────────
  set("y5-fdp", "Year 5", "Maths", "Fractions, decimals and percentages", "Fractions (including decimals and percentages)", "%", [
    Q("½ as a decimal is…", "0.5", "0.2", "1.2", "0.05"),
    Q("¼ as a percentage is…", "25%", "40%", "4%", "75%"),
    Q("0.7 as a fraction is…", "7/10", "7/100", "1/7", "70/10"),
    Q("50% of 80 =", "40", "30", "50", "160"),
    Q("Which is the largest?", "0.8", "0.75", "0.08", "0.59"),
    Q("3/5 + 1/5 =", "4/5", "4/10", "3/25", "1"),
    Q("10% of 250 =", "25", "2.5", "10", "50"),
    Q("Round 3.62 to the nearest whole number", "4", "3", "3.6", "36"),
  ]),
  set("y5-earth-space", "Year 5", "Science", "Earth and space", "Earth and space · Forces", "🪐", [
    Q("How long does the Earth take to go round the Sun?", "About 365 days", "24 hours", "28 days", "7 days"),
    Q("Day and night happen because the Earth…", "spins on its axis", "goes round the Sun", "is tilted", "has a Moon"),
    Q("Which planet is closest to the Sun?", "Mercury", "Venus", "Earth", "Mars"),
    Q("The Moon orbits the…", "Earth", "Sun", "Mars", "Moon"),
    Q("What pulls objects towards the Earth?", "Gravity", "Friction", "Magnetism", "Air resistance"),
    Q("Which is the largest planet?", "Jupiter", "Saturn", "Earth", "Neptune"),
    Q("Air resistance slows down a…", "parachute", "magnet", "plant", "battery"),
    Q("The Sun is a…", "star", "planet", "moon", "comet"),
  ]),
  set("y5-modal-relative", "Year 5", "English", "Modal verbs and relative clauses", "Grammar and punctuation", "🧠", [
    Q("Which is a modal verb?", "might", "run", "happy", "table"),
    Q("Which shows most certainty?", "will", "might", "could", "may"),
    Q("Find the relative pronoun: 'The boy who won smiled.'", "who", "boy", "won", "smiled"),
    Q("Which word starts a relative clause?", "which", "and", "but", "because"),
    Q("Brackets, dashes or commas around extra information are for…", "parenthesis", "a list", "speech", "a question"),
    Q("Which is an adverb of possibility?", "perhaps", "quickly", "red", "jump"),
    Q("'The cake, which was chocolate, vanished.' The relative clause is…", "which was chocolate", "The cake", "vanished", "chocolate vanished"),
    Q("Which word is a synonym of 'enormous'?", "huge", "tiny", "fast", "quiet"),
  ]),
  set("y5-multiply", "Year 5", "Maths", "Multiply and divide", "Multiplication and division", "📐", [
    Q("23 × 10 =", "230", "2300", "33", "203"),
    Q("4500 ÷ 100 =", "45", "450", "4.5", "4400"),
    Q("Which is a prime number?", "13", "15", "21", "9"),
    Q("Which is a square number?", "49", "40", "50", "18"),
    Q("What is 6² (six squared)?", "36", "12", "62", "18"),
    Q("A factor of 24 is…", "8", "5", "7", "9"),
    Q("34 × 3 =", "102", "92", "112", "37"),
    Q("What is 5³ (five cubed)?", "125", "15", "25", "53"),
  ]),

  // ── Year 6 ────────────────────────────────────────────────────────────────
  set("y6-sats-arith", "Year 6", "Maths", "SATs arithmetic warm-up", "Arithmetic (KS2 SATs)", "🏆", [
    Q("1,000 − 456 =", "544", "654", "556", "456"),
    Q("25 × 12 =", "300", "250", "275", "312"),
    Q("3/4 of 60 =", "45", "40", "15", "20"),
    Q("0.6 × 7 =", "4.2", "42", "0.42", "6.7"),
    Q("144 ÷ 12 =", "12", "14", "11", "13"),
    Q("2/3 + 1/6 =", "5/6", "3/9", "1/2", "3/6"),
    Q("15% of 200 =", "30", "15", "20", "35"),
    Q("8 + 2 × 5 =", "18", "50", "20", "15"),
    Q("4.5 + 2.75 =", "7.25", "6.25", "7.2", "6.80"),
  ]),
  set("y6-spag", "Year 6", "English", "SPaG: grammar and punctuation", "Grammar, punctuation and spelling (SATs)", "📚", [
    Q("Which sentence is in the passive voice?", "The ball was kicked by Sam.", "Sam kicked the ball.", "Sam kicks the ball.", "Sam will kick the ball."),
    Q("Which punctuation mark separates two independent clauses?", "semi-colon", "comma", "apostrophe", "hyphen"),
    Q("Which is the subjunctive form?", "If I were you, I would go.", "If I was you, I go.", "If I am you, I went.", "If I be you, I goes."),
    Q("What is an antonym of 'generous'?", "mean", "kind", "giving", "large"),
    Q("Which word is spelt correctly?", "necessary", "neccessary", "necesary", "neccesary"),
    Q("A colon can introduce a…", "list", "question", "name", "verb"),
    Q("Which word is a determiner in 'Those apples are ripe'?", "Those", "apples", "are", "ripe"),
    Q("Which sentence uses a hyphen correctly?", "She is a well-known author.", "She is a well known-author.", "She-is a well known author.", "She is a-well known author."),
  ]),
  set("y6-science", "Year 6", "Science", "Evolution, circulation and electricity", "Evolution · Animals including humans · Electricity", "❤️", [
    Q("Which organ pumps blood around the body?", "Heart", "Lungs", "Brain", "Stomach"),
    Q("Blood carries oxygen from the…", "lungs", "stomach", "bones", "skin"),
    Q("Animals and plants changing over a very long time is called…", "evolution", "erosion", "evaporation", "electricity"),
    Q("Offspring are similar to, but not exactly like, their…", "parents", "habitat", "food", "planet"),
    Q("Adding more batteries to a circuit makes a bulb…", "brighter", "dimmer", "go out", "change colour"),
    Q("Which scientist is known for the theory of evolution?", "Charles Darwin", "Isaac Newton", "Marie Curie", "Albert Einstein"),
    Q("Light travels in…", "straight lines", "circles", "zig-zags", "curves only"),
    Q("Which group are fungi in?", "Living things", "Rocks", "Gases", "Metals"),
  ]),

  // ── SSS · WAEC: Trigonometry, bearings & distance ─────────────────────────
  set("waec-bearings", "SSS 2", "Maths", "Bearings & back bearings", "Bearings: north, clockwise, three figures", "🧭", [
    Q("Bearings are measured…", "from North, clockwise", "from North, anticlockwise", "from East, clockwise", "from South, clockwise"),
    Q("The bearing of due East is…", "090°", "045°", "180°", "270°"),
    Q("The bearing of South-West is…", "225°", "135°", "315°", "045°"),
    Q("How is a bearing of 45 degrees written?", "045°", "45°", "0.45°", "450°"),
    Q("“The bearing of B from A” — where do you draw the North line?", "At A", "At B", "Halfway between A and B", "At either point"),
    Q("The bearing of B from A is 065°. Find the bearing of A from B.", "245°", "115°", "295°", "065°"),
    Q("The bearing of Y from X is 115°. Find the bearing of X from Y.", "295°", "065°", "245°", "335°"),
    Q("The bearing of D from C is 308°. Find the bearing of C from D.", "128°", "052°", "232°", "148°"),
    Q("The bearing of N from M is 090°. Find the bearing of M from N.", "270°", "090°", "180°", "000°"),
    Q("Q is on a bearing of 250° from P. Find the bearing of P from Q.", "070°", "110°", "160°", "430°"),
    Q("The bearing of P from Q is 305°. What is the bearing of Q from P?", "125°", "055°", "235°", "145°"),
    Q("A ship on a bearing of 070° turns 90° clockwise. Its new bearing is…", "160°", "340°", "020°", "250°"),
  ]),
  set("waec-bearing-distance", "SSS 2", "Maths", "Bearing & distance problems", "Bearings with Pythagoras, sine and cosine rule", "🚢", [
    Q("A ship sails at 20 km/h for 2½ hours. How far does it sail?", "50 km", "22.5 km", "40 km", "8 km"),
    Q("A ship sails 50 km on a bearing of 040°. How far north of its start is it?", "38.3 km", "32.1 km", "41.9 km", "59.6 km"),
    Q("A ship sails 50 km on a bearing of 040°. How far east of its start is it?", "32.1 km", "38.3 km", "41.9 km", "42.0 km"),
    Q("A ship sails 20 km on a bearing of 130°. How far east of its start is it?", "15.3 km", "12.9 km", "16.8 km", "10.8 km"),
    Q("A ship sails 20 km on a bearing of 130°. How far south of its start is it?", "12.9 km", "15.3 km", "6.8 km", "18.8 km"),
    Q("Q is 12 km from P on 050°. R is 15 km from Q on 140°. Find ∠PQR.", "90°", "100°", "50°", "140°"),
    Q("Q is 12 km from P on 050°. R is 15 km from Q on 140°. Find PR.", "19.2 km", "27 km", "3 km", "13.4 km"),
    Q("Q is 12 km from P on 050°. R is 15 km from Q on 140°. Find the bearing of R from P.", "101°", "051°", "140°", "129°"),
    Q("A boat sails 8 km on 040° to A, then 6 km on 120° to B. Find ∠HAB.", "100°", "80°", "160°", "120°"),
    Q("A boat sails 8 km on 040° to A, then 6 km on 120° to B. Find HB.", "10.8 km", "14 km", "10 km", "6.7 km"),
    Q("A boat sails 8 km on 040° to A, then 6 km on 120° to B. Find the bearing of B from H.", "073°", "040°", "107°", "080°"),
    Q("No right angle, two sides and the angle between them are known. To find the third side use…", "the cosine rule", "Pythagoras' theorem", "the sine rule", "SOH-CAH-TOA"),
    Q("B is 9 km from A on 030°. C is 12 km from A on 120°. Find BC.", "15 km", "21 km", "7.9 km", "3 km"),
    Q("X to Y is 15 km on 070°, then Y to Z is 9 km on 200°. Find ∠XYZ.", "50°", "130°", "70°", "20°"),
    Q("X to Y is 15 km on 070°, then Y to Z is 9 km on 200°. Find XZ.", "11.5 km", "24 km", "17.5 km", "6 km"),
  ]),
  set("waec-trig-elevation", "SSS 2", "Maths", "Trig ratios, elevation & depression", "SOH-CAH-TOA, exact values, elevation and depression", "📐", [
    Q("sin θ = …", "Opposite ÷ Hypotenuse", "Adjacent ÷ Hypotenuse", "Opposite ÷ Adjacent", "Hypotenuse ÷ Opposite"),
    Q("The side opposite the right angle is the…", "hypotenuse", "adjacent", "opposite", "base"),
    Q("A 6 m ladder makes 60° with level ground. How high up the wall does it reach?", "5.20 m", "3.00 m", "6.93 m", "10.39 m"),
    Q("Opposite = 7 cm, adjacent = 9 cm. Find θ.", "37.9°", "52.1°", "38.9°", "51.1°"),
    Q("The exact value of tan 60° is…", "√3", "1/√3", "√3/2", "1/2"),
    Q("The exact value of sin 30° is…", "1/2", "√3/2", "1/√2", "√3"),
    Q("The exact value of cos 45° is…", "1/√2", "1/2", "√3/2", "1"),
    Q("A boy 1.5 m tall is 40 m from a tower; the elevation of the top is 52°. Height of the tower?", "52.7 m", "51.2 m", "31.5 m", "53.2 m"),
    Q("From the top of an 80 m cliff the angle of depression of a boat is 25°. How far is the boat from the cliff?", "171.6 m", "37.3 m", "88.3 m", "189.3 m"),
    Q("Hypotenuse 15 cm, angle 28°. Find the side adjacent to the angle.", "13.2 cm", "7.0 cm", "17.0 cm", "8.0 cm"),
    Q("Opposite = 5 cm, hypotenuse = 13 cm. Find θ.", "22.6°", "67.4°", "21.0°", "23.6°"),
    Q("30 m from a building, the angle of elevation of the top is 38°. Find the height.", "23.4 m", "18.5 m", "38.4 m", "24.4 m"),
    Q("From the top of a 45 m lighthouse the angle of depression of a ship is 20°. How far is the ship?", "123.6 m", "16.4 m", "47.9 m", "131.6 m"),
    Q("Angles of elevation and depression are measured from the…", "horizontal", "vertical", "North line", "ground"),
    Q("For trigonometry in degrees, the calculator must show…", "D (DEG)", "R (RAD)", "G (GRAD)", "FIX"),
  ]),
];

// As live-quiz questions (answer = index of the right option).
export function quizQuestions(s: UKSet) {
  return s.questions.map((x) => ({ q: x.q, options: x.options, answer: x.options.indexOf(x.answer), seconds: secondsFor(s) }));
}
// As class-game questions (the arcade "choice" game).
export function gameItems(s: UKSet) {
  return s.questions.map((x) => ({ lead: s.topic, prompt: x.q, options: x.options, answer: x.answer }));
}
export const findUKSet = (id: string) => UK_SETS.find((s) => s.id === id);
