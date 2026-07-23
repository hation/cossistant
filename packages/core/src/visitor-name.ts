/**
 * Visitor Name Generator
 *
 * Generates consistent, deterministic names for anonymous visitors
 * based on their visitor ID. The same ID will always produce the same name.
 *
 * This module is shared between frontend and backend to ensure consistency.
 */

// Adjectives - descriptors for the visitor name
const ADJECTIVES = [
	"happy",
	"sunny",
	"cosmic",
	"stellar",
	"swift",
	"mighty",
	"clever",
	"brave",
	"gentle",
	"noble",
	"quick",
	"bright",
	"silver",
	"golden",
	"crystal",
	"mystic",
	"ancient",
	"modern",
	"electric",
	"magnetic",
	"dynamic",
	"static",
	"flying",
	"dancing",
	"singing",
	"laughing",
	"smiling",
	"glowing",
	"shining",
	"sparkling",
	"dazzling",
	"radiant",
	"peaceful",
	"serene",
	"tranquil",
	"vibrant",
	"energetic",
	"lively",
	"spirited",
	"bold",
	"fearless",
	"curious",
	"wise",
	"witty",
	"charming",
	"elegant",
	"graceful",
	"agile",
	"nimble",
	"speedy",
	"zippy",
	"bouncy",
	"jolly",
	"merry",
	"cheerful",
	"playful",
	"friendly",
	"loyal",
	"honest",
	"kind",
	"warm",
	"cool",
	"chill",
	"awesome",
	"amazing",
	"wonderful",
	"fantastic",
	"magnificent",
	"marvelous",
	"splendid",
	"brilliant",
	"genius",
	"super",
	"mega",
	"ultra",
	"hyper",
	"turbo",
	"quantum",
	"nano",
	"micro",
	"macro",
	"epic",
	"legendary",
	"mythic",
	"heroic",
	"royal",
	"imperial",
	"majestic",
] as const;

// Nouns - animals, objects, nature elements
const NOUNS = [
	// Animals
	"panda",
	"dolphin",
	"eagle",
	"falcon",
	"hawk",
	"owl",
	"raven",
	"phoenix",
	"dragon",
	"unicorn",
	"griffin",
	"pegasus",
	"lion",
	"tiger",
	"leopard",
	"cheetah",
	"panther",
	"wolf",
	"fox",
	"bear",
	"koala",
	"kangaroo",
	"rabbit",
	"squirrel",
	"hedgehog",
	"otter",
	"seal",
	"whale",
	"shark",
	"octopus",
	"jellyfish",
	"starfish",
	"butterfly",
	"dragonfly",
	"firefly",
	"bee",
	"hummingbird",
	"peacock",
	"flamingo",
	"penguin",
	// Nature elements
	"mountain",
	"valley",
	"river",
	"ocean",
	"forest",
	"desert",
	"glacier",
	"volcano",
	"canyon",
	"meadow",
	"prairie",
	"savanna",
	"tundra",
	"rainforest",
	"waterfall",
	"geyser",
	"aurora",
	"comet",
	"meteor",
	"planet",
	"galaxy",
	"nebula",
	"constellation",
	"star",
	"moon",
	"sun",
	"eclipse",
	"horizon",
	"sunrise",
	"sunset",
	"rainbow",
	"thunder",
	"lightning",
	"storm",
	"breeze",
	"wind",
	"tornado",
	"hurricane",
	"blizzard",
	"avalanche",
	// Cool objects and concepts
	"rocket",
	"satellite",
	"spaceship",
	"explorer",
	"pioneer",
	"voyager",
	"wanderer",
	"nomad",
	"knight",
	"samurai",
	"ninja",
	"wizard",
	"sage",
	"oracle",
	"prophet",
	"champion",
	"guardian",
	"sentinel",
	"watcher",
	"keeper",
	"protector",
	"defender",
	"warrior",
	"hero",
	"artist",
	"painter",
	"sculptor",
	"musician",
	"composer",
	"poet",
	"writer",
	"dreamer",
	"thinker",
	"scholar",
	"scientist",
	"inventor",
	"creator",
	"builder",
	"architect",
	"engineer",
] as const;

/**
 * Simple hash function to convert string to number
 * Used for deterministic visitor name generation
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a deterministic visitor name from a seed (typically visitor ID)
 * The same seed will always produce the same name.
 *
 * @param seed - A string to use as seed (typically visitor ID)
 * @returns A name like "Happy Panda" or "Cosmic Eagle"
 */
export function generateVisitorName(seed: string): string {
	const hash = hashString(seed);

	// Use different parts of the hash for each word selection
	const adjectiveIndex = hash % ADJECTIVES.length;
	const nounIndex = (hash >> 8) % NOUNS.length;

	const adjective = ADJECTIVES[adjectiveIndex] ?? "anonymous";
	const noun = NOUNS[nounIndex] ?? "visitor";

	return `${capitalize(adjective)} ${capitalize(noun)}`;
}

/**
 * Get a display name for a visitor, with fallbacks:
 * 1. Contact name (if available)
 * 2. Email username (if available)
 * 3. Generated name from visitor ID
 *
 * @param visitor - Visitor object with optional contact info and required ID
 * @returns A display name for the visitor
 */
export function getVisitorNameWithFallback(visitor: {
	contact?: {
		name?: string | null;
		email?: string | null;
	} | null;
	id: string;
}): string {
	return (
		visitor?.contact?.name ||
		visitor?.contact?.email?.split("@")[0] ||
		generateVisitorName(visitor.id)
	);
}
