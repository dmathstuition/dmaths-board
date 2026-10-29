// Curated content for the English class games. British (and Nigerian)
// spelling throughout. Every bank is split by level so difficulty means
// something: easy ≈ Primary 4–6, medium ≈ JSS, hard ≈ SSS / WAEC.

import type { Difficulty } from "@/lib/games/generators";

export type Leveled<T> = Record<Difficulty, T[]>;

// ── Spelling: word + a clue that points to exactly one word ───────────────
export type SpellWord = { word: string; clue: string };
export const SPELLING: Leveled<SpellWord> = {
  easy: [
    { word: "apple", clue: "A round fruit that can be red or green" },
    { word: "house", clue: "A building where a family lives" },
    { word: "school", clue: "Where pupils go to learn" },
    { word: "water", clue: "Clear liquid we drink every day" },
    { word: "chair", clue: "A seat with a back and four legs" },
    { word: "happy", clue: "Feeling glad and cheerful" },
    { word: "river", clue: "A large stream of water flowing to the sea" },
    { word: "bread", clue: "Food baked from flour" },
    { word: "train", clue: "It runs on a railway track" },
    { word: "clock", clue: "It shows you the time" },
    { word: "smile", clue: "What your face does when you are pleased" },
    { word: "horse", clue: "An animal people ride" },
    { word: "mango", clue: "A sweet yellow tropical fruit" },
    { word: "teacher", clue: "The person who teaches a class" },
    { word: "friend", clue: "Someone you like and trust" },
    { word: "garden", clue: "Where flowers and vegetables are grown" },
    { word: "pencil", clue: "You write and draw with it, then rub it out" },
    { word: "rabbit", clue: "A small animal with long ears" },
    { word: "window", clue: "Glass in a wall that lets in light" },
    { word: "yellow", clue: "The colour of a ripe banana" },
    { word: "market", clue: "A place where people buy and sell goods" },
    { word: "farmer", clue: "A person who grows crops or keeps animals" },
    { word: "doctor", clue: "A person who treats sick people" },
    { word: "kitchen", clue: "The room where food is cooked" },
    { word: "bottle", clue: "A container for drinks with a narrow neck" },
    { word: "flower", clue: "The colourful part of a plant" },
    { word: "monkey", clue: "An animal that swings in trees" },
    { word: "basket", clue: "A woven container for carrying things" },
    { word: "sister", clue: "A girl who has the same parents as you" },
    { word: "button", clue: "A small round fastener on a shirt" },
  ],
  medium: [
    { word: "library", clue: "A place where you borrow books" },
    { word: "February", clue: "The second month of the year" },
    { word: "Wednesday", clue: "The day after Tuesday" },
    { word: "science", clue: "The study of the natural world through experiments" },
    { word: "beautiful", clue: "Very pleasing to look at" },
    { word: "believe", clue: "To accept that something is true" },
    { word: "calendar", clue: "A chart showing the days and months of the year" },
    { word: "different", clue: "Not the same" },
    { word: "favourite", clue: "Liked more than all the others" },
    { word: "government", clue: "The group of people who run a country" },
    { word: "knowledge", clue: "Facts and skills you have learned" },
    { word: "language", clue: "English, Yoruba and Hausa are examples of one" },
    { word: "neighbour", clue: "A person who lives next door" },
    { word: "although", clue: "A word meaning 'even though'" },
    { word: "business", clue: "Buying and selling to make money" },
    { word: "continent", clue: "Africa and Asia are each one of these" },
    { word: "dictionary", clue: "A book that gives the meanings of words" },
    { word: "environment", clue: "The natural world around us" },
    { word: "exercise", clue: "Physical activity that keeps you fit" },
    { word: "pleasant", clue: "Nice and enjoyable" },
    { word: "frightened", clue: "Afraid or scared" },
    { word: "grammar", clue: "The rules of how words are put together" },
    { word: "height", clue: "How tall something is" },
    { word: "interrupt", clue: "To stop someone while they are speaking" },
    { word: "medicine", clue: "Something you take to get better" },
    { word: "occasion", clue: "A special event or time" },
    { word: "question", clue: "A sentence that asks something" },
    { word: "separate", clue: "To keep apart" },
    { word: "temperature", clue: "How hot or cold something is" },
    { word: "vegetable", clue: "A plant such as a carrot or spinach that we eat" },
  ],
  hard: [
    { word: "accommodate", clue: "To provide room or lodging for" },
    { word: "necessary", clue: "Needed; essential" },
    { word: "embarrass", clue: "To make someone feel awkward or ashamed" },
    { word: "conscience", clue: "Your inner sense of right and wrong" },
    { word: "occurrence", clue: "Something that happens; an event" },
    { word: "definitely", clue: "Without any doubt" },
    { word: "rhythm", clue: "A regular repeated pattern of sound or beats" },
    { word: "privilege", clue: "A special right or advantage" },
    { word: "millennium", clue: "A period of a thousand years" },
    { word: "questionnaire", clue: "A set of written questions for a survey" },
    { word: "recommend", clue: "To suggest something as good" },
    { word: "parliament", clue: "The body that makes laws in some countries" },
    { word: "guarantee", clue: "A firm promise that something will happen" },
    { word: "entrepreneur", clue: "A person who starts their own business" },
    { word: "pronunciation", clue: "The way a word is said" },
    { word: "conscientious", clue: "Careful and hard-working" },
    { word: "exaggerate", clue: "To make something seem bigger than it is" },
    { word: "independent", clue: "Free from outside control" },
    { word: "maintenance", clue: "Keeping something in good condition" },
    { word: "mischievous", clue: "Playfully naughty" },
    { word: "perseverance", clue: "Continuing to try despite difficulty" },
    { word: "receipt", clue: "A written note that you have paid" },
    { word: "restaurant", clue: "A place where you buy and eat meals" },
    { word: "surveillance", clue: "Close watch kept over someone" },
    { word: "acquaintance", clue: "A person you know slightly" },
    { word: "committee", clue: "A group chosen to make decisions" },
    { word: "colleague", clue: "A person you work with" },
    { word: "correspondence", clue: "Letters or emails exchanged between people" },
    { word: "lieutenant", clue: "A junior officer in the army or navy" },
    { word: "vacuum", clue: "A space with no air in it" },
  ],
};

// ── Synonyms & antonyms (memory match) ────────────────────────────────────
export const SYNONYMS: Leveled<[string, string]> = {
  easy: [["big", "large"], ["small", "little"], ["happy", "glad"], ["fast", "quick"], ["start", "begin"], ["end", "finish"],
    ["shut", "close"], ["gift", "present"], ["smart", "clever"], ["scared", "afraid"], ["sad", "unhappy"], ["shout", "yell"]],
  medium: [["brave", "bold"], ["rich", "wealthy"], ["angry", "furious"], ["tired", "weary"], ["choose", "select"], ["help", "assist"],
    ["enough", "sufficient"], ["famous", "renowned"], ["hide", "conceal"], ["polite", "courteous"], ["silent", "quiet"], ["strange", "odd"]],
  hard: [["abundant", "plentiful"], ["candid", "frank"], ["diligent", "hard-working"], ["eminent", "distinguished"], ["frugal", "thrifty"],
    ["hostile", "unfriendly"], ["obstinate", "stubborn"], ["prudent", "wise"], ["reluctant", "unwilling"], ["vivid", "bright"],
    ["ambiguous", "unclear"], ["meticulous", "careful"]],
};
export const ANTONYMS: Leveled<[string, string]> = {
  easy: [["hot", "cold"], ["up", "down"], ["early", "late"], ["full", "empty"], ["strong", "weak"], ["rich", "poor"],
    ["open", "closed"], ["day", "night"], ["happy", "sad"], ["tall", "short"], ["win", "lose"], ["light", "dark"]],
  medium: [["ancient", "modern"], ["generous", "selfish"], ["accept", "refuse"], ["arrive", "depart"], ["victory", "defeat"],
    ["public", "private"], ["increase", "decrease"], ["include", "exclude"], ["expensive", "cheap"], ["temporary", "permanent"],
    ["noisy", "silent"], ["timid", "bold"]],
  hard: [["scarce", "abundant"], ["humble", "arrogant"], ["expand", "contract"], ["praise", "criticise"], ["artificial", "natural"],
    ["optimistic", "pessimistic"], ["transparent", "opaque"], ["voluntary", "compulsory"], ["hostile", "friendly"],
    ["superior", "inferior"], ["benevolent", "malevolent"], ["vague", "precise"]],
};

// ── Parts of speech ───────────────────────────────────────────────────────
export type POS = "noun" | "verb" | "adjective" | "adverb" | "pronoun" | "preposition" | "conjunction" | "interjection";
export const POS_ITEMS: Leveled<{ sentence: string; word: string; pos: POS }> = {
  easy: [
    { sentence: "The dog barked loudly.", word: "dog", pos: "noun" },
    { sentence: "Ada runs to school every day.", word: "runs", pos: "verb" },
    { sentence: "We ate a sweet mango.", word: "sweet", pos: "adjective" },
    { sentence: "The tall boy won the race.", word: "tall", pos: "adjective" },
    { sentence: "Musa kicked the ball.", word: "kicked", pos: "verb" },
    { sentence: "The teacher wrote on the board.", word: "teacher", pos: "noun" },
    { sentence: "Birds sing in the morning.", word: "sing", pos: "verb" },
    { sentence: "She wore a red dress.", word: "red", pos: "adjective" },
    { sentence: "Lagos is a busy city.", word: "city", pos: "noun" },
    { sentence: "The baby cried all night.", word: "cried", pos: "verb" },
  ],
  medium: [
    { sentence: "The old man walked slowly.", word: "slowly", pos: "adverb" },
    { sentence: "They visited the museum.", word: "They", pos: "pronoun" },
    { sentence: "She sings beautifully.", word: "beautifully", pos: "adverb" },
    { sentence: "Give the book to him.", word: "him", pos: "pronoun" },
    { sentence: "The brave soldier saved the child.", word: "brave", pos: "adjective" },
    { sentence: "Happiness is important.", word: "Happiness", pos: "noun" },
    { sentence: "We often play football.", word: "often", pos: "adverb" },
    { sentence: "Chidi studied hard for the test.", word: "studied", pos: "verb" },
    { sentence: "It is raining heavily.", word: "It", pos: "pronoun" },
    { sentence: "The children laughed happily.", word: "happily", pos: "adverb" },
  ],
  hard: [
    { sentence: "The cat hid under the table.", word: "under", pos: "preposition" },
    { sentence: "I was tired, but I finished my homework.", word: "but", pos: "conjunction" },
    { sentence: "Wow! That was amazing.", word: "Wow", pos: "interjection" },
    { sentence: "We waited until the rain stopped.", word: "until", pos: "conjunction" },
    { sentence: "The letter is from my uncle.", word: "from", pos: "preposition" },
    { sentence: "Although he was ill, he came to school.", word: "Although", pos: "conjunction" },
    { sentence: "She walked across the bridge.", word: "across", pos: "preposition" },
    { sentence: "Ouch! I hit my toe.", word: "Ouch", pos: "interjection" },
    { sentence: "Her honesty impressed everyone.", word: "honesty", pos: "noun" },
    { sentence: "The results were surprisingly good.", word: "surprisingly", pos: "adverb" },
    { sentence: "Nobody answered the phone.", word: "Nobody", pos: "pronoun" },
    { sentence: "The committee approved the plan.", word: "approved", pos: "verb" },
  ],
};

// ── Verbs for Tense Trouble: base, 3rd person, past, past participle, -ing ─
export type Verb = [string, string, string, string, string];
export const VERBS: Leveled<Verb> = {
  easy: [["walk", "walks", "walked", "walked", "walking"], ["play", "plays", "played", "played", "playing"], ["jump", "jumps", "jumped", "jumped", "jumping"],
    ["cook", "cooks", "cooked", "cooked", "cooking"], ["go", "goes", "went", "gone", "going"], ["eat", "eats", "ate", "eaten", "eating"],
    ["see", "sees", "saw", "seen", "seeing"], ["run", "runs", "ran", "run", "running"], ["sing", "sings", "sang", "sung", "singing"]],
  medium: [["write", "writes", "wrote", "written", "writing"], ["take", "takes", "took", "taken", "taking"], ["drink", "drinks", "drank", "drunk", "drinking"],
    ["give", "gives", "gave", "given", "giving"], ["speak", "speaks", "spoke", "spoken", "speaking"], ["swim", "swims", "swam", "swum", "swimming"],
    ["begin", "begins", "began", "begun", "beginning"], ["choose", "chooses", "chose", "chosen", "choosing"], ["fly", "flies", "flew", "flown", "flying"]],
  hard: [["arise", "arises", "arose", "arisen", "arising"], ["forbid", "forbids", "forbade", "forbidden", "forbidding"], ["seek", "seeks", "sought", "sought", "seeking"],
    ["lay", "lays", "laid", "laid", "laying"], ["lie", "lies", "lay", "lain", "lying"], ["strive", "strives", "strove", "striven", "striving"],
    ["bear", "bears", "bore", "borne", "bearing"], ["tear", "tears", "tore", "torn", "tearing"], ["shrink", "shrinks", "shrank", "shrunk", "shrinking"]],
};

// ── Homophones: a sentence with a gap and the set it's drawn from ─────────
export const HOMOPHONES: Leveled<{ sentence: string; answer: string; set: string[] }> = {
  easy: [
    { sentence: "They left ___ bags at home.", answer: "their", set: ["their", "there", "they're"] },
    { sentence: "Put the box over ___.", answer: "there", set: ["their", "there", "they're"] },
    { sentence: "___ going to the market.", answer: "They're", set: ["Their", "There", "They're"] },
    { sentence: "I have ___ brothers.", answer: "two", set: ["to", "too", "two"] },
    { sentence: "We are going ___ church.", answer: "to", set: ["to", "too", "two"] },
    { sentence: "This tea is ___ hot.", answer: "too", set: ["to", "too", "two"] },
    { sentence: "I can ___ the drums.", answer: "hear", set: ["hear", "here"] },
    { sentence: "Come and sit ___.", answer: "here", set: ["hear", "here"] },
    { sentence: "The ___ is shining.", answer: "sun", set: ["sun", "son"] },
    { sentence: "I ___ the race!", answer: "won", set: ["won", "one"] },
  ],
  medium: [
    { sentence: "___ the best player in the team.", answer: "You're", set: ["Your", "You're"] },
    { sentence: "Is this ___ pen?", answer: "your", set: ["your", "you're"] },
    { sentence: "The dog wagged ___ tail.", answer: "its", set: ["its", "it's"] },
    { sentence: "___ raining again.", answer: "It's", set: ["Its", "It's"] },
    { sentence: "I don't know ___ to go.", answer: "whether", set: ["weather", "whether"] },
    { sentence: "The ___ is cold today.", answer: "weather", set: ["weather", "whether"] },
    { sentence: "She ___ the ball to me.", answer: "threw", set: ["threw", "through"] },
    { sentence: "We walked ___ the forest.", answer: "through", set: ["threw", "through"] },
    { sentence: "Please ___ your name here.", answer: "write", set: ["right", "write"] },
    { sentence: "The ___ of the cake was lovely.", answer: "piece", set: ["peace", "piece"] },
  ],
  hard: [
    { sentence: "The medicine had a strong ___ on him.", answer: "effect", set: ["affect", "effect"] },
    { sentence: "Noise can ___ your concentration.", answer: "affect", set: ["affect", "effect"] },
    { sentence: "The school ___ spoke at assembly.", answer: "principal", set: ["principal", "principle"] },
    { sentence: "Honesty is an important ___.", answer: "principle", set: ["principal", "principle"] },
    { sentence: "Envelopes and writing paper are called ___.", answer: "stationery", set: ["stationary", "stationery"] },
    { sentence: "The car remained ___ at the lights.", answer: "stationary", set: ["stationary", "stationery"] },
    { sentence: "I need your ___ on this matter.", answer: "advice", set: ["advice", "advise"] },
    { sentence: "I ___ you to study daily.", answer: "advise", set: ["advice", "advise"] },
    { sentence: "Everyone came ___ Bisi.", answer: "except", set: ["accept", "except"] },
    { sentence: "Please ___ my apology.", answer: "accept", set: ["accept", "except"] },
    { sentence: "The ___ of the story is clear.", answer: "moral", set: ["moral", "morale"] },
  ],
};

// ── Concord (subject–verb agreement), WAEC style ──────────────────────────
export const CONCORD: Leveled<{ sentence: string; options: string[]; answer: string }> = {
  easy: [
    { sentence: "The boy ___ to school.", options: ["walk", "walks"], answer: "walks" },
    { sentence: "The girls ___ singing.", options: ["is", "are"], answer: "are" },
    { sentence: "My mother ___ rice every Sunday.", options: ["cook", "cooks"], answer: "cooks" },
    { sentence: "We ___ happy today.", options: ["is", "are"], answer: "are" },
    { sentence: "The cats ___ milk.", options: ["like", "likes"], answer: "like" },
    { sentence: "He ___ a new bicycle.", options: ["have", "has"], answer: "has" },
    { sentence: "I ___ my homework.", options: ["does", "do"], answer: "do" },
    { sentence: "The baby ___ crying.", options: ["is", "are"], answer: "is" },
  ],
  medium: [
    { sentence: "Each of the students ___ a book.", options: ["has", "have"], answer: "has" },
    { sentence: "Neither Tolu nor Emeka ___ ready.", options: ["is", "are"], answer: "is" },
    { sentence: "The list of names ___ on the wall.", options: ["is", "are"], answer: "is" },
    { sentence: "Everybody ___ the answer.", options: ["know", "knows"], answer: "knows" },
    { sentence: "The teacher, with her pupils, ___ arrived.", options: ["has", "have"], answer: "has" },
    { sentence: "Mathematics ___ my favourite subject.", options: ["is", "are"], answer: "is" },
    { sentence: "Bread and butter ___ my breakfast.", options: ["is", "are"], answer: "is" },
    { sentence: "My trousers ___ torn.", options: ["is", "are"], answer: "are" },
  ],
  hard: [
    { sentence: "The jury ___ divided in their opinions.", options: ["was", "were"], answer: "were" },
    { sentence: "Either the principal or the teachers ___ to blame.", options: ["is", "are"], answer: "are" },
    { sentence: "One of the boys who ___ late was punished.", options: ["was", "were"], answer: "were" },
    { sentence: "The news ___ very encouraging.", options: ["was", "were"], answer: "was" },
    { sentence: "A number of students ___ absent.", options: ["was", "were"], answer: "were" },
    { sentence: "The number of students ___ increased.", options: ["has", "have"], answer: "has" },
    { sentence: "Ten kilometres ___ a long way to walk.", options: ["is", "are"], answer: "is" },
    { sentence: "The cattle ___ grazing in the field.", options: ["is", "are"], answer: "are" },
    { sentence: "Not only the students but also the teacher ___ excited.", options: ["was", "were"], answer: "was" },
    { sentence: "Physics, as well as chemistry, ___ taught here.", options: ["is", "are"], answer: "is" },
  ],
};

// ── Punctuation: exactly one correct sentence in each set ─────────────────
export const PUNCTUATION: Leveled<{ correct: string; wrong: string[] }> = {
  easy: [
    { correct: "My name is Ada.", wrong: ["my name is Ada.", "My name is ada.", "My name is Ada"] },
    { correct: "Where do you live?", wrong: ["Where do you live.", "where do you live?", "Where do you live!"] },
    { correct: "I like apples, oranges and bananas.", wrong: ["I like apples oranges and bananas.", "I like, apples, oranges and bananas.", "I like apples. oranges and bananas."] },
    { correct: "We went to Abuja on Monday.", wrong: ["We went to abuja on Monday.", "We went to Abuja on monday.", "we went to Abuja on Monday."] },
    { correct: "What a lovely day!", wrong: ["What a lovely day?", "what a lovely day!", "What a lovely, day!"] },
  ],
  medium: [
    { correct: "The boy's bag is blue.", wrong: ["The boys bag is blue.", "The boys' bag is blue.", "The boy's bag, is blue."] },
    { correct: "It's time to go home.", wrong: ["Its time to go home.", "Its' time to go home.", "It's time, to go home"] },
    { correct: "\"Come here,\" said Mum.", wrong: ["\"Come here\" said Mum.", "\"Come here,\" said mum", "Come here, said Mum."] },
    { correct: "The girls' toilets are closed.", wrong: ["The girls toilets are closed.", "The girl's' toilets are closed.", "The girls's toilets are closed."] },
    { correct: "However, the rain did not stop.", wrong: ["However the rain did not stop.", "However; the rain did not stop.", "however, the rain did not stop."] },
  ],
  hard: [
    { correct: "I bought three things: rice, beans and oil.", wrong: ["I bought three things; rice, beans and oil.", "I bought: three things rice, beans and oil.", "I bought three things, rice: beans and oil."] },
    { correct: "My brother, who lives in Kano, is a doctor.", wrong: ["My brother who lives in Kano, is a doctor.", "My brother, who lives in Kano is a doctor.", "My brother who, lives in Kano, is a doctor."] },
    { correct: "It was late; we decided to go home.", wrong: ["It was late, we decided to go home.", "It was late; We decided to go home.", "It was late: we decided, to go home."] },
    { correct: "The children's books are on the shelf.", wrong: ["The childrens' books are on the shelf.", "The childrens books are on the shelf.", "The children's' books are on the shelf."] },
    { correct: "\"Are you coming?\" she asked.", wrong: ["\"Are you coming\"? she asked.", "\"Are you coming,\" she asked?", "\"Are you coming?\", she asked."] },
  ],
};

// ── Plurals ───────────────────────────────────────────────────────────────
export const PLURALS: Leveled<[string, string]> = {
  easy: [["cat", "cats"], ["box", "boxes"], ["baby", "babies"], ["bus", "buses"], ["dish", "dishes"], ["lady", "ladies"],
    ["church", "churches"], ["city", "cities"], ["fox", "foxes"], ["toy", "toys"]],
  medium: [["child", "children"], ["man", "men"], ["mouse", "mice"], ["tooth", "teeth"], ["foot", "feet"], ["knife", "knives"],
    ["leaf", "leaves"], ["sheep", "sheep"], ["potato", "potatoes"], ["wolf", "wolves"], ["woman", "women"], ["goose", "geese"]],
  hard: [["stimulus", "stimuli"], ["criterion", "criteria"], ["analysis", "analyses"], ["phenomenon", "phenomena"], ["crisis", "crises"],
    ["bacterium", "bacteria"], ["thesis", "theses"], ["alumnus", "alumni"], ["mother-in-law", "mothers-in-law"], ["passer-by", "passers-by"],
    ["axis", "axes"], ["oasis", "oases"]],
};

// ── Prefixes that make opposites ──────────────────────────────────────────
export const PREFIXES: Leveled<[string, string]> = {
  easy: [["happy", "un"], ["kind", "un"], ["honour", "dis"], ["agree", "dis"], ["tidy", "un"], ["lock", "un"], ["obey", "dis"], ["fair", "un"]],
  medium: [["possible", "im"], ["perfect", "im"], ["correct", "in"], ["visible", "in"], ["honest", "dis"], ["patient", "im"], ["appear", "dis"], ["complete", "in"]],
  hard: [["legal", "il"], ["logical", "il"], ["regular", "ir"], ["responsible", "ir"], ["mature", "im"], ["relevant", "ir"], ["literate", "il"], ["adequate", "in"], ["mortal", "im"], ["rational", "ir"]],
};
export const PREFIX_SET = ["un", "dis", "in", "im", "il", "ir"];

// ── Vocabulary (word → meaning) ───────────────────────────────────────────
export const VOCAB: Leveled<[string, string]> = {
  easy: [["enormous", "very big"], ["tiny", "very small"], ["ancient", "very old"], ["swift", "very fast"], ["damp", "slightly wet"],
    ["weary", "very tired"], ["timid", "shy and easily frightened"], ["fragile", "easily broken"], ["gloomy", "dark and sad"], ["delighted", "very pleased"]],
  medium: [["reluctant", "unwilling to do something"], ["generous", "happy to give to others"], ["anxious", "worried and nervous"],
    ["cautious", "careful to avoid danger"], ["curious", "eager to know or learn"], ["obvious", "easy to see or understand"],
    ["humble", "not proud or boastful"], ["vacant", "empty; not occupied"], ["rigid", "stiff and not bending"], ["vast", "very great in size or area"]],
  hard: [["ubiquitous", "found everywhere"], ["benevolent", "kind and generous"], ["ephemeral", "lasting a very short time"],
    ["meticulous", "showing great attention to detail"], ["pragmatic", "dealing with things sensibly and practically"],
    ["candid", "truthful and straightforward"], ["lethargic", "sluggish and lacking energy"], ["eloquent", "fluent and persuasive in speaking"],
    ["frugal", "careful with money; not wasteful"], ["tenacious", "holding firmly; determined"], ["ambiguous", "having more than one meaning"],
    ["indifferent", "having no interest or concern"]],
};

// ── Idioms (WAEC favourites) ──────────────────────────────────────────────
export const IDIOMS: Leveled<[string, string]> = {
  easy: [["a piece of cake", "something very easy"], ["over the moon", "extremely happy"], ["under the weather", "feeling ill"],
    ["break the ice", "start a conversation in an awkward situation"], ["call it a day", "stop working for the day"],
    ["hit the books", "study hard"]],
  medium: [["let the cat out of the bag", "reveal a secret"], ["cost an arm and a leg", "be very expensive"],
    ["once in a blue moon", "very rarely"], ["see eye to eye", "agree with someone"], ["beat around the bush", "avoid saying something directly"],
    ["the last straw", "the final problem that makes a situation unbearable"], ["burn the midnight oil", "work or study late into the night"]],
  hard: [["bury the hatchet", "make peace after a quarrel"], ["a white elephant", "a costly possession that is of little use"],
    ["to show the white feather", "to act like a coward"], ["a dark horse", "a person who surprises others with hidden ability"],
    ["to take the bull by the horns", "to face a difficulty boldly"], ["a storm in a teacup", "a lot of fuss about something unimportant"],
    ["to throw in the towel", "to admit defeat"], ["a wet blanket", "a person who spoils others' fun"],
    ["to blow one's own trumpet", "to boast about oneself"], ["to bell the cat", "to undertake a dangerous task for others"]],
};

// ── Odd one out (categories) ──────────────────────────────────────────────
export const CATEGORIES: Leveled<{ name: string; words: string[] }> = {
  easy: [
    { name: "fruits", words: ["mango", "orange", "banana", "pawpaw", "pineapple", "guava"] },
    { name: "animals", words: ["goat", "lion", "elephant", "zebra", "rabbit", "monkey"] },
    { name: "colours", words: ["red", "blue", "green", "purple", "yellow", "brown"] },
    { name: "body parts", words: ["hand", "knee", "elbow", "nose", "shoulder", "ankle"] },
    { name: "school items", words: ["pencil", "ruler", "eraser", "notebook", "crayon", "sharpener"] },
  ],
  medium: [
    { name: "occupations", words: ["lawyer", "engineer", "nurse", "carpenter", "pilot", "tailor"] },
    { name: "musical instruments", words: ["guitar", "drum", "piano", "trumpet", "violin", "flute"] },
    { name: "planets", words: ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Neptune"] },
    { name: "means of transport", words: ["bus", "canoe", "aeroplane", "bicycle", "train", "lorry"] },
    { name: "weather words", words: ["rain", "thunder", "drizzle", "harmattan", "storm", "fog"] },
  ],
  hard: [
    { name: "adverbs", words: ["quickly", "silently", "eagerly", "rarely", "gently", "boldly"] },
    { name: "adjectives", words: ["brave", "honest", "fragile", "ancient", "gloomy", "curious"] },
    { name: "verbs", words: ["evaporate", "construct", "persuade", "negotiate", "observe", "abandon"] },
    { name: "abstract nouns", words: ["courage", "honesty", "freedom", "wisdom", "patience", "justice"] },
    { name: "conjunctions", words: ["although", "because", "unless", "whereas", "since", "while"] },
  ],
};

// ── Sentence builder: words in their only natural order ───────────────────
export const SENTENCES: Leveled<string> = {
  easy: ["The cat is sleeping.", "I love my school.", "We play football daily.", "She has a red bag.", "The sun is very hot.",
    "My father is a farmer.", "Birds can fly high.", "Tolu reads every night."],
  medium: ["The children are playing in the garden.", "My sister bought a new dress yesterday.", "Please close the door behind you.",
    "We will travel to Kano next week.", "The teacher asked us a difficult question.", "He has finished all his homework."],
  hard: ["Despite the heavy rain, the match continued.", "The book that you lent me was fascinating.",
    "Had I known, I would have come earlier.", "Neither the students nor the teacher was late.",
    "The committee has approved the new school rules."],
};

// ══ More built-in content ═══════════════════════════════════════════════
// Kept separate so the banks above stay readable. Everything here follows the
// same rules (unique within a level, one clearly right answer).

SPELLING.easy.push(
  { word: "banana", clue: "A long yellow fruit" },
  { word: "table", clue: "Furniture with a flat top and legs" },
  { word: "pocket", clue: "A small bag sewn into clothes" },
  { word: "candle", clue: "A wax stick that gives light when lit" },
  { word: "spoon", clue: "You eat soup with it" },
  { word: "plate", clue: "A flat dish you eat food from" },
  { word: "sleep", clue: "What you do in bed at night" },
  { word: "money", clue: "Coins and notes used to buy things" },
  { word: "shoes", clue: "You wear them on your feet" },
  { word: "green", clue: "The colour of fresh grass" },
  { word: "uncle", clue: "Your father's or mother's brother" },
  { word: "church", clue: "A building for Christian worship" },
  { word: "mosque", clue: "A building where Muslims pray" },
  { word: "dance", clue: "To move your body to music" },
  { word: "lemon", clue: "A sour yellow fruit" },
  { word: "tiger", clue: "A large wild cat with stripes" },
  { word: "zebra", clue: "A horse-like animal with black and white stripes" },
  { word: "ladder", clue: "Steps you climb to reach high places" },
  { word: "bucket", clue: "A container with a handle for carrying water" },
  { word: "letter", clue: "A written message sent by post" },
  { word: "jacket", clue: "A short coat" },
  { word: "cousin", clue: "The child of your aunt or uncle" },
  { word: "parrot", clue: "A colourful bird that can copy words" },
  { word: "puzzle", clue: "A game that tests your thinking" },
  { word: "spider", clue: "A small creature with eight legs" },
  { word: "pillow", clue: "A soft cushion for your head in bed" },
  { word: "number", clue: "A word or figure such as seven or 7" },
  { word: "carrot", clue: "An orange root vegetable" },
  { word: "orange", clue: "A round citrus fruit" },
  { word: "tomato", clue: "A soft red fruit used in stew" },
);
SPELLING.medium.push(
  { word: "address", clue: "Where someone lives, written on a letter" },
  { word: "argument", clue: "A disagreement between people" },
  { word: "August", clue: "The eighth month of the year" },
  { word: "bicycle", clue: "A two-wheeled vehicle you pedal" },
  { word: "breathe", clue: "To take air into your lungs" },
  { word: "certain", clue: "Completely sure" },
  { word: "chocolate", clue: "A sweet brown food made from cocoa" },
  { word: "daughter", clue: "A person's female child" },
  { word: "describe", clue: "To say what something is like" },
  { word: "disappear", clue: "To vanish from sight" },
  { word: "especially", clue: "Particularly; above all" },
  { word: "experiment", clue: "A scientific test" },
  { word: "guard", clue: "A person who keeps watch" },
  { word: "heard", clue: "Past tense of 'hear'" },
  { word: "island", clue: "Land with water all around it" },
  { word: "journey", clue: "A trip from one place to another" },
  { word: "minute", clue: "Sixty seconds" },
  { word: "naughty", clue: "Badly behaved" },
  { word: "opposite", clue: "Completely different; facing" },
  { word: "particular", clue: "Specific; one and not another" },
  { word: "peculiar", clue: "Strange or odd" },
  { word: "possession", clue: "Something you own" },
  { word: "probably", clue: "Very likely" },
  { word: "promise", clue: "To say you will certainly do something" },
  { word: "quarter", clue: "One of four equal parts" },
  { word: "recent", clue: "Happened not long ago" },
  { word: "remember", clue: "To keep something in your mind" },
  { word: "straight", clue: "Without a bend or curve" },
  { word: "surprise", clue: "Something unexpected" },
  { word: "thought", clue: "An idea in your mind" },
);
SPELLING.hard.push(
  { word: "abundance", clue: "A very large quantity" },
  { word: "accidentally", clue: "By chance; not on purpose" },
  { word: "achievement", clue: "Something done successfully with effort" },
  { word: "aggressive", clue: "Ready to attack or argue" },
  { word: "apparent", clue: "Clearly seen or understood" },
  { word: "beginning", clue: "The start of something" },
  { word: "bureaucracy", clue: "Government by many officials and rules" },
  { word: "cemetery", clue: "A place where the dead are buried" },
  { word: "commitment", clue: "Dedication to a cause or promise" },
  { word: "consensus", clue: "General agreement" },
  { word: "deceive", clue: "To make someone believe something false" },
  { word: "discipline", clue: "Training people to obey rules" },
  { word: "dilemma", clue: "A difficult choice between two options" },
  { word: "fluorescent", clue: "Glowing with a very bright colour" },
  { word: "foreign", clue: "From another country" },
  { word: "harass", clue: "To trouble or annoy someone repeatedly" },
  { word: "hierarchy", clue: "A system of ranks from top to bottom" },
  { word: "immediately", clue: "At once; without delay" },
  { word: "jewellery", clue: "Rings, necklaces and bracelets" },
  { word: "liaison", clue: "Communication between groups" },
  { word: "manoeuvre", clue: "A skilful movement" },
  { word: "noticeable", clue: "Easy to see or notice" },
  { word: "occasionally", clue: "Now and then" },
  { word: "parallel", clue: "Side by side and never meeting" },
  { word: "playwright", clue: "A person who writes plays" },
  { word: "siege", clue: "An army surrounding a town to capture it" },
  { word: "referred", clue: "Past tense of 'refer'" },
  { word: "sincerely", clue: "Honestly; used to end formal letters" },
  { word: "threshold", clue: "The strip of floor across a doorway" },
  { word: "unnecessary", clue: "Not needed" },
);

SYNONYMS.easy.push(["mistake", "error"], ["street", "road"], ["sick", "ill"], ["shop", "store"], ["silly", "foolish"], ["stone", "rock"],
  ["kind", "nice"], ["jump", "leap"], ["easy", "simple"], ["hurry", "rush"], ["look", "see"], ["speak", "talk"]);
SYNONYMS.medium.push(["rapid", "swift"], ["purchase", "buy"], ["inquire", "ask"], ["courage", "bravery"], ["reply", "answer"], ["vanish", "disappear"],
  ["damp", "moist"], ["gather", "collect"], ["permit", "allow"], ["huge", "enormous"], ["attempt", "try"], ["evil", "wicked"]);
SYNONYMS.hard.push(["affluent", "rich"], ["ardent", "passionate"], ["arduous", "difficult"], ["clandestine", "secret"], ["docile", "gentle"],
  ["fortitude", "courage"], ["impeccable", "flawless"], ["lucid", "clear"], ["mundane", "ordinary"], ["ostentatious", "showy"],
  ["tranquil", "calm"], ["benign", "harmless"]);

ANTONYMS.easy.push(["fast", "slow"], ["big", "small"], ["clean", "dirty"], ["old", "new"], ["push", "pull"], ["give", "take"],
  ["laugh", "cry"], ["wet", "dry"], ["hard", "soft"], ["first", "last"], ["above", "below"], ["thick", "thin"]);
ANTONYMS.medium.push(["brave", "cowardly"], ["entrance", "exit"], ["minimum", "maximum"], ["guilty", "innocent"], ["rough", "smooth"],
  ["polite", "rude"], ["shallow", "deep"], ["borrow", "lend"], ["import", "export"], ["frequent", "rare"], ["visible", "invisible"],
  ["majority", "minority"]);
ANTONYMS.hard.push(["conceal", "reveal"], ["prosperity", "poverty"], ["ascend", "descend"], ["frugal", "extravagant"], ["lenient", "strict"],
  ["concise", "wordy"], ["genuine", "fake"], ["hasty", "deliberate"], ["diligent", "lazy"], ["candid", "evasive"], ["rigid", "flexible"],
  ["ally", "enemy"]);

POS_ITEMS.easy.push(
  { sentence: "The girl sang a song.", word: "sang", pos: "verb" },
  { sentence: "The green frog jumped.", word: "green", pos: "adjective" },
  { sentence: "My uncle drives a taxi.", word: "taxi", pos: "noun" },
  { sentence: "We swim in the river.", word: "swim", pos: "verb" },
  { sentence: "It was a cold night.", word: "cold", pos: "adjective" },
  { sentence: "The pupils clapped quickly.", word: "quickly", pos: "adverb" },
  { sentence: "The farmer planted yams.", word: "farmer", pos: "noun" },
  { sentence: "Bola has a big house.", word: "big", pos: "adjective" },
  { sentence: "The bus stopped suddenly.", word: "suddenly", pos: "adverb" },
  { sentence: "Chioma writes neatly.", word: "writes", pos: "verb" },
);
POS_ITEMS.medium.push(
  { sentence: "She gave me a present.", word: "me", pos: "pronoun" },
  { sentence: "We will visit them tomorrow.", word: "tomorrow", pos: "adverb" },
  { sentence: "The careful driver stopped.", word: "careful", pos: "adjective" },
  { sentence: "Our team won the cup.", word: "won", pos: "verb" },
  { sentence: "Honesty pays.", word: "Honesty", pos: "noun" },
  { sentence: "He spoke softly to the baby.", word: "softly", pos: "adverb" },
  { sentence: "Those books are mine.", word: "mine", pos: "pronoun" },
  { sentence: "The lazy dog slept.", word: "lazy", pos: "adjective" },
  { sentence: "Kemi danced gracefully.", word: "gracefully", pos: "adverb" },
  { sentence: "The audience cheered loudly.", word: "audience", pos: "noun" },
);
POS_ITEMS.hard.push(
  { sentence: "The bag is beside the door.", word: "beside", pos: "preposition" },
  { sentence: "Hurray! We won!", word: "Hurray", pos: "interjection" },
  { sentence: "You can come if you finish early.", word: "if", pos: "conjunction" },
  { sentence: "They travelled during the holiday.", word: "during", pos: "preposition" },
  { sentence: "Oh, I forgot my key.", word: "Oh", pos: "interjection" },
  { sentence: "She is tall and he is short.", word: "and", pos: "conjunction" },
  { sentence: "His bravery earned him a medal.", word: "bravery", pos: "noun" },
  { sentence: "Somebody left the gate open.", word: "Somebody", pos: "pronoun" },
);

VERBS.easy.push(["sleep", "sleeps", "slept", "slept", "sleeping"], ["buy", "buys", "bought", "bought", "buying"],
  ["come", "comes", "came", "come", "coming"], ["sit", "sits", "sat", "sat", "sitting"], ["dance", "dances", "danced", "danced", "dancing"],
  ["catch", "catches", "caught", "caught", "catching"]);
VERBS.medium.push(["break", "breaks", "broke", "broken", "breaking"], ["freeze", "freezes", "froze", "frozen", "freezing"],
  ["ride", "rides", "rode", "ridden", "riding"], ["throw", "throws", "threw", "thrown", "throwing"], ["wake", "wakes", "woke", "woken", "waking"],
  ["steal", "steals", "stole", "stolen", "stealing"]);
VERBS.hard.push(["weave", "weaves", "wove", "woven", "weaving"], ["slay", "slays", "slew", "slain", "slaying"],
  ["forsake", "forsakes", "forsook", "forsaken", "forsaking"], ["cling", "clings", "clung", "clung", "clinging"],
  ["sting", "stings", "stung", "stung", "stinging"], ["spring", "springs", "sprang", "sprung", "springing"]);

HOMOPHONES.easy.push(
  { sentence: "She has a ___ dress.", answer: "blue", set: ["blue", "blew"] },
  { sentence: "The wind ___ the leaves away.", answer: "blew", set: ["blue", "blew"] },
  { sentence: "I ___ the answer.", answer: "know", set: ["no", "know"] },
  { sentence: "There is ___ milk left.", answer: "no", set: ["no", "know"] },
  { sentence: "We swam in the ___.", answer: "sea", set: ["see", "sea"] },
  { sentence: "I can ___ the moon.", answer: "see", set: ["see", "sea"] },
  { sentence: "The spider has ___ legs.", answer: "eight", set: ["ate", "eight"] },
  { sentence: "We ___ rice for lunch.", answer: "ate", set: ["ate", "eight"] },
);
HOMOPHONES.medium.push(
  { sentence: "Turn ___ at the junction.", answer: "right", set: ["right", "write"] },
  { sentence: "The baker will ___ the dough.", answer: "knead", set: ["need", "knead"] },
  { sentence: "We ___ more chairs.", answer: "need", set: ["need", "knead"] },
  { sentence: "She wore a ___ on her finger.", answer: "ring", set: ["ring", "wring"] },
  { sentence: "___ the water out of the cloth.", answer: "Wring", set: ["Ring", "Wring"] },
  { sentence: "The dog wagged its long ___.", answer: "tail", set: ["tail", "tale"] },
  { sentence: "Grandma told us a ___ about a tortoise.", answer: "tale", set: ["tail", "tale"] },
  { sentence: "We prayed for ___ in the land.", answer: "peace", set: ["peace", "piece"] },
);
HOMOPHONES.hard.push(
  { sentence: "She paid me a lovely ___.", answer: "compliment", set: ["complement", "compliment"] },
  { sentence: "The sauce is a perfect ___ to the rice.", answer: "complement", set: ["complement", "compliment"] },
  { sentence: "The local ___ met on Monday.", answer: "council", set: ["council", "counsel"] },
  { sentence: "The lawyer gave wise ___.", answer: "counsel", set: ["council", "counsel"] },
  { sentence: "We had ice cream for ___.", answer: "dessert", set: ["desert", "dessert"] },
  { sentence: "The Sahara is a vast ___.", answer: "desert", set: ["desert", "dessert"] },
);

CONCORD.easy.push(
  { sentence: "The birds ___ in the tree.", options: ["sing", "sings"], answer: "sing" },
  { sentence: "She ___ to music.", options: ["listen", "listens"], answer: "listens" },
  { sentence: "They ___ my friends.", options: ["is", "are"], answer: "are" },
  { sentence: "The dog ___ loudly.", options: ["bark", "barks"], answer: "barks" },
  { sentence: "My brothers ___ football.", options: ["play", "plays"], answer: "play" },
  { sentence: "It ___ very hot today.", options: ["is", "are"], answer: "is" },
);
CONCORD.medium.push(
  { sentence: "Every boy and girl ___ a seat.", options: ["has", "have"], answer: "has" },
  { sentence: "Neither of the answers ___ correct.", options: ["is", "are"], answer: "is" },
  { sentence: "The scissors ___ on the table.", options: ["is", "are"], answer: "are" },
  { sentence: "Twenty naira ___ not enough.", options: ["is", "are"], answer: "is" },
  { sentence: "The team ___ won every match.", options: ["has", "have"], answer: "has" },
  { sentence: "Somebody ___ taken my pen.", options: ["has", "have"], answer: "has" },
);
CONCORD.hard.push(
  { sentence: "Politics ___ a difficult career.", options: ["is", "are"], answer: "is" },
  { sentence: "The police ___ investigating the case.", options: ["is", "are"], answer: "are" },
  { sentence: "Each of the girls ___ her own book.", options: ["has", "have"], answer: "has" },
  { sentence: "Either the boys or Ada ___ the dishes.", options: ["wash", "washes"], answer: "washes" },
  { sentence: "The furniture in the room ___ new.", options: ["is", "are"], answer: "is" },
  { sentence: "The majority of the students ___ present.", options: ["was", "were"], answer: "were" },
);

PUNCTUATION.easy.push(
  { correct: "Can you help me?", wrong: ["Can you help me.", "can you help me?", "Can you help me!"] },
  { correct: "Tolu, Emeka and Ada are friends.", wrong: ["Tolu Emeka and Ada are friends.", "tolu, Emeka and Ada are friends.", "Tolu, Emeka and Ada are friends"] },
  { correct: "I live in Port Harcourt.", wrong: ["I live in port harcourt.", "I live in Port harcourt.", "i live in Port Harcourt."] },
  { correct: "Watch out for the car!", wrong: ["Watch out for the car?", "watch out for the car!", "Watch out, for the car!"] },
  { correct: "My birthday is in June.", wrong: ["My birthday is in june.", "my birthday is in June.", "My Birthday is in june."] },
);
PUNCTUATION.medium.push(
  { correct: "We're going to the market.", wrong: ["Were going to the market.", "We'r going to the market.", "Wer'e going to the market."] },
  { correct: "\"I am hungry,\" said Musa.", wrong: ["\"I am hungry\" said Musa.", "I am hungry, said Musa.", "\"I am hungry,\" Said Musa."] },
  { correct: "The dog's bone is buried.", wrong: ["The dogs bone is buried.", "The dog's bone, is buried.", "The dogs's bone is buried."] },
  { correct: "Yes, I will come.", wrong: ["Yes I will come.", "Yes, i will come.", "Yes; I will come."] },
  { correct: "They don't like rice.", wrong: ["They dont like rice.", "They do'nt like rice.", "They don't like rice"] },
);
PUNCTUATION.hard.push(
  { correct: "Bring the following: a pen, a ruler and an eraser.", wrong: ["Bring the following; a pen, a ruler and an eraser.", "Bring the following a pen, a ruler and an eraser.", "Bring: the following a pen, a ruler and an eraser."] },
  { correct: "The men's shoes are on sale.", wrong: ["The mens shoes are on sale.", "The mens' shoes are on sale.", "The men's' shoes are on sale."] },
  { correct: "If it rains, we will stay indoors.", wrong: ["If it rains we will stay, indoors.", "If, it rains we will stay indoors.", "If it rains; we will stay indoors."] },
  { correct: "Lagos, the largest city in Nigeria, is very busy.", wrong: ["Lagos the largest city in Nigeria, is very busy.", "Lagos, the largest city in Nigeria is very busy.", "Lagos, the largest city, in Nigeria is very busy."] },
  { correct: "She asked whether I was ready.", wrong: ["She asked whether I was ready?", "She asked, \"whether I was ready.\"", "She asked whether, I was ready."] },
);

PLURALS.easy.push(["bird", "birds"], ["glass", "glasses"], ["story", "stories"], ["boy", "boys"], ["watch", "watches"], ["key", "keys"],
  ["tomato", "tomatoes"], ["party", "parties"]);
PLURALS.medium.push(["life", "lives"], ["half", "halves"], ["ox", "oxen"], ["louse", "lice"], ["deer", "deer"], ["shelf", "shelves"]);
PLURALS.hard.push(["hypothesis", "hypotheses"], ["basis", "bases"], ["diagnosis", "diagnoses"], ["son-in-law", "sons-in-law"],
  ["commander-in-chief", "commanders-in-chief"], ["parenthesis", "parentheses"]);

PREFIXES.easy.push(["usual", "un"], ["safe", "un"], ["well", "un"], ["trust", "dis"], ["load", "un"], ["pack", "un"]);
PREFIXES.medium.push(["active", "in"], ["accurate", "in"], ["proper", "im"], ["obedient", "dis"], ["direct", "in"], ["pure", "im"]);
PREFIXES.hard.push(["legible", "il"], ["reversible", "ir"], ["moral", "im"], ["resistible", "ir"]);

VOCAB.easy.push(["brave", "not afraid of danger"], ["hungry", "needing food"], ["dull", "not interesting"], ["polite", "having good manners"],
  ["crowded", "full of people"], ["clever", "quick to learn"], ["shiny", "bright and reflecting light"], ["noisy", "making a lot of sound"],
  ["empty", "having nothing inside"], ["thirsty", "needing a drink"], ["wealthy", "having a lot of money"], ["lonely", "sad because you are alone"]);
VOCAB.medium.push(["famine", "a serious lack of food"], ["fierce", "violent and frightening"], ["genuine", "real; not fake"],
  ["hesitate", "to pause before acting"], ["loyal", "faithful to someone"], ["neglect", "to fail to care for"], ["peculiar", "strange or unusual"],
  ["prosper", "to succeed and do well"], ["scarce", "in short supply"], ["sturdy", "strong and solid"], ["tremble", "to shake with fear or cold"],
  ["wander", "to walk about without a purpose"]);
VOCAB.hard.push(["acrimonious", "bitter and angry"], ["belligerent", "aggressive and ready to fight"], ["capricious", "changing mood suddenly"],
  ["diffident", "lacking self-confidence"], ["gregarious", "fond of company; sociable"], ["insipid", "lacking flavour or interest"],
  ["jubilant", "full of joy and triumph"], ["obsolete", "no longer used; out of date"], ["penitent", "sorry for wrongdoing"],
  ["recalcitrant", "stubbornly disobedient"], ["sporadic", "happening now and then"], ["verbose", "using too many words"]);

IDIOMS.easy.push(["raining cats and dogs", "raining very heavily"], ["in hot water", "in trouble"], ["all ears", "listening carefully"],
  ["a big fish", "an important person"], ["cold feet", "feeling too nervous to do something"], ["hold your horses", "wait; be patient"]);
IDIOMS.medium.push(["hit the nail on the head", "say exactly the right thing"], ["cry over spilt milk", "worry about something that cannot be changed"],
  ["a blessing in disguise", "something good that seemed bad at first"], ["kill two birds with one stone", "achieve two things with one action"],
  ["when pigs fly", "never"], ["in the same boat", "in the same difficult situation"]);
IDIOMS.hard.push(["to pay through the nose", "to pay far too much"], ["to carry coals to Newcastle", "to do something unnecessary"],
  ["Achilles' heel", "a weak point"], ["to cross the Rubicon", "to take a step that cannot be undone"],
  ["a Greek gift", "a gift given in order to cause harm"], ["to have a chip on one's shoulder", "to feel resentful about something"]);

CATEGORIES.easy.push(
  { name: "vegetables", words: ["carrot", "cabbage", "spinach", "okra", "onion", "pepper"] },
  { name: "clothes", words: ["shirt", "trousers", "skirt", "cap", "socks", "gown"] },
  { name: "kitchen things", words: ["pot", "spoon", "kettle", "plate", "knife", "cup"] },
);
CATEGORIES.medium.push(
  { name: "sports", words: ["football", "tennis", "boxing", "swimming", "athletics", "basketball"] },
  { name: "shapes", words: ["triangle", "circle", "square", "rectangle", "hexagon", "oval"] },
  { name: "family members", words: ["aunt", "nephew", "cousin", "grandmother", "niece", "uncle"] },
);
CATEGORIES.hard.push(
  { name: "prepositions", words: ["beneath", "among", "through", "beyond", "towards", "against"] },
  { name: "pronouns", words: ["themselves", "whoever", "anyone", "nobody", "ours", "whom"] },
  { name: "collective nouns", words: ["herd", "flock", "swarm", "crew", "fleet", "troop"] },
);

SENTENCES.easy.push("I drink milk every morning.", "The baby is crying loudly.", "We go to church on Sunday.", "My mother cooks tasty food.",
  "The dog ran after the cat.", "Ada likes to read books.");
SENTENCES.medium.push("The old woman sold oranges at the market.", "Our class will visit the zoo tomorrow.", "I forgot my umbrella at school.",
  "The doctor told him to rest.", "She always finishes her work early.", "They watched a football match last night.");
SENTENCES.hard.push("Although it was late, they kept working.", "The man whose car was stolen called the police.",
  "If you study hard, you will pass.", "Hardly had we arrived when it started raining.", "Not only did she sing, but she also danced.");

// ══ Bank access + A.I extras ═════════════════════════════════════════════
// Generators read banks through `bank()`, which merges the built-in items
// above with any extra items loaded at runtime (A.I-written questions that
// the server has already validated — see lib/games/aiBank.ts).
export const BANKS = {
  spelling: SPELLING, synonyms: SYNONYMS, antonyms: ANTONYMS, pos: POS_ITEMS, verbs: VERBS, homophones: HOMOPHONES,
  concord: CONCORD, punctuation: PUNCTUATION, plurals: PLURALS, prefixes: PREFIXES, vocab: VOCAB, idioms: IDIOMS,
  categories: CATEGORIES, sentences: SENTENCES,
};
export type BankKind = keyof typeof BANKS;
export type BankItem<K extends BankKind> = (typeof BANKS)[K][Difficulty][number];

// A stable identity for an item, used to skip duplicates.
export function itemKey(kind: BankKind, item: any): string {
  const norm = (x: unknown) => String(x ?? "").trim().toLowerCase();
  switch (kind) {
    case "spelling": return norm(item.word);
    case "pos": case "homophones": case "concord": return norm(item.sentence);
    case "punctuation": return norm(item.correct);
    case "categories": return norm(item.name) + ":" + [...(item.words ?? [])].map(norm).sort().join(",");
    case "sentences": return norm(item);
    default: return norm(Array.isArray(item) ? item[0] : item);
  }
}

const EXTRA: Partial<Record<BankKind, Leveled<any>>> = {};

export function bank<K extends BankKind>(kind: K, d: Difficulty): BankItem<K>[] {
  const extra = EXTRA[kind]?.[d] ?? [];
  return extra.length ? [...(BANKS[kind][d] as BankItem<K>[]), ...extra] : (BANKS[kind][d] as BankItem<K>[]);
}

// Add extra items to a bank, skipping any already present. Returns how many were new.
export function addExtra(kind: BankKind, d: Difficulty, items: unknown[]): number {
  const slot = (EXTRA[kind] ??= { easy: [], medium: [], hard: [] });
  const seen = new Set(bank(kind, d).map((x) => itemKey(kind, x)));
  let added = 0;
  for (const it of items) {
    const k = itemKey(kind, it);
    if (!k || seen.has(k)) continue;
    seen.add(k); slot[d].push(it); added++;
  }
  return added;
}

export function extraCount(kind: BankKind, d: Difficulty): number {
  return EXTRA[kind]?.[d]?.length ?? 0;
}

// Deal items like cards: shuffle the whole bank and work through it, so a
// learner doesn't see a repeat until every item (built-in + A.I) has come up.
// The deck reshuffles when it runs out or when the bank grows.
const DECKS = new Map<string, { items: unknown[]; i: number; size: number }>();
export function draw<K extends BankKind>(kind: K, d: Difficulty, rng: () => number = Math.random): BankItem<K> {
  const all = bank(kind, d);
  const key = `${kind}:${d}`;
  let deck = DECKS.get(key);
  if (!deck || deck.size !== all.length || deck.i >= deck.items.length) {
    const items = [...all];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(rng() * (i + 1)));
      [items[i], items[j]] = [items[j], items[i]];
    }
    deck = { items, i: 0, size: all.length };
    DECKS.set(key, deck);
  }
  return deck.items[deck.i++] as BankItem<K>;
}

// Test helper: forget all runtime extras.
export function clearExtras(): void {
  (Object.keys(EXTRA) as BankKind[]).forEach((k) => { delete EXTRA[k]; });
  DECKS.clear();
}
