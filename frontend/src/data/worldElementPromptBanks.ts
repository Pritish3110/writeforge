type WorldCategoryKey = "physical" | "cultural" | "magic";

export interface WorldPromptComponentBank {
  cores: readonly string[];
  mechanics: readonly string[];
  impacts: readonly string[];
  consequences: readonly string[];
}

export interface WorldPromptBank extends WorldPromptComponentBank {
  templates: readonly string[];
}

const bank = (
  cores: readonly string[],
  mechanics: readonly string[],
  impacts: readonly string[],
  consequences: readonly string[],
): WorldPromptComponentBank => ({
  cores,
  mechanics,
  impacts,
  consequences,
});

const capitalize = (value: string) =>
  value.trim() ? value.trim().charAt(0).toUpperCase() + value.trim().slice(1) : "";

const formatElementLabel = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === "of" || word === "with" || word === "and" || word === "to") return word;
      return capitalize(word);
    })
    .join(" ");

const WORLD_TEMPLATE_PATTERNS: Record<WorldCategoryKey, readonly string[]> = {
  physical: [
    "Design the world's {elementLabel} so {core} depends on {mechanic}, reshaping {impact} and creating {consequence}.",
    "Build a physical system around {elementLabel}: {core} is governed by {mechanic}, which changes {impact} and can trigger {consequence}.",
    "Treat {elementLabel} as an environmental pressure point. Show how {core} runs through {mechanic}, alters {impact}, and risks {consequence}.",
  ],
  cultural: [
    "Design a cultural framework around {elementLabel}, where {core} is sustained through {mechanic}, reshaping {impact} and inviting {consequence}.",
    "Build the world's {elementLabel} as a lived social system: {core} relies on {mechanic}, influences {impact}, and can create {consequence}.",
    "Treat {elementLabel} as a cultural pressure line. Show how {core} emerges from {mechanic}, changes {impact}, and risks {consequence}.",
  ],
  magic: [
    "Design the world's {elementLabel} so {core} is powered by {mechanic}, altering {impact} and causing {consequence}.",
    "Build an arcane system around {elementLabel}: {core} depends on {mechanic}, reshapes {impact}, and can unleash {consequence}.",
    "Treat {elementLabel} as a magical leverage point. Show how {core} is stabilized through {mechanic}, changes {impact}, and risks {consequence}.",
  ],
};

export const WORLD_TEMPLATES = Array.from(
  new Set(Object.values(WORLD_TEMPLATE_PATTERNS).flat()),
);

const createTemplateBank = (
  category: WorldCategoryKey,
  element: string,
): readonly string[] =>
  WORLD_TEMPLATE_PATTERNS[category].map((template) =>
    template.replace(/\{elementLabel\}/g, formatElementLabel(element)),
  );

const attachTemplates = (
  category: WorldCategoryKey,
  banks: Record<string, WorldPromptComponentBank>,
): Record<string, WorldPromptBank> =>
  Object.fromEntries(
    Object.entries(banks).map(([element, promptBank]) => [
      element,
      {
        ...promptBank,
        templates: createTemplateBank(category, element),
      },
    ]),
  );

export const WORLD_CATEGORY_PROMPT_BANKS: Record<WorldCategoryKey, WorldPromptBank> = {
  physical: {
    templates: createTemplateBank("physical", "environmental systems"),
    cores: [
      "weather fronts",
      "tectonic fault lines",
      "migratory fauna",
      "forest canopies",
      "river deltas",
      "tidal systems",
      "mountain passes",
      "desert ecology",
      "glacial shelves",
      "atmospheric visibility",
    ],
    mechanics: [
      "seasonal pressure shifts",
      "erosion cycles",
      "ocean-current feedback",
      "geothermal pressure",
      "predator-prey balance",
      "wind corridors",
      "lunar pull",
      "mineral runoff",
      "biotic symbiosis",
      "storm accumulation",
    ],
    impacts: [
      "travel routes",
      "settlement safety",
      "food supply",
      "resource harvesting",
      "border defense",
      "navigation",
      "agriculture",
      "seasonal migration",
      "architecture",
      "trade access",
    ],
    consequences: [
      "flooding",
      "crop failure",
      "habitat collapse",
      "erosion damage",
      "resource scarcity",
      "terrain fractures",
      "storm saturation",
      "navigation loss",
      "ecological imbalance",
      "regional isolation",
    ],
  },
  cultural: {
    templates: createTemplateBank("cultural", "social systems"),
    cores: [
      "ancestor worship",
      "market guilds",
      "border rituals",
      "harvest cuisine",
      "court fashion",
      "marriage customs",
      "rank inheritance",
      "military oaths",
      "dialect drift",
      "forbidden festivals",
    ],
    mechanics: [
      "ritual repetition",
      "public shame",
      "trade dependency",
      "oral tradition",
      "clan enforcement",
      "ceremonial exchange",
      "state propaganda",
      "generational duty",
      "legal precedent",
      "social performance",
    ],
    impacts: [
      "family structure",
      "political legitimacy",
      "class mobility",
      "community trust",
      "religious identity",
      "food security",
      "diplomatic relations",
      "military loyalty",
      "language preservation",
      "social belonging",
    ],
    consequences: [
      "social unrest",
      "cultural erosion",
      "class resentment",
      "identity fracture",
      "ritual stagnation",
      "black-market power",
      "border violence",
      "institutional hypocrisy",
      "generational conflict",
      "public distrust",
    ],
  },
  magic: {
    templates: createTemplateBank("magic", "arcane systems"),
    cores: [
      "ley-line flow",
      "spell lattice design",
      "artifact binding",
      "ritual circles",
      "mana inheritance",
      "corruption bloom",
      "ward networks",
      "soul-fueled casting",
      "anti-magic fields",
      "summoning contracts",
    ],
    mechanics: [
      "magical resonance",
      "bloodline attunement",
      "energy siphoning",
      "ritual activation",
      "memory-linked casting",
      "sacrifice exchange",
      "cosmic alignment",
      "stored charge decay",
      "sympathetic links",
      "runic stabilization",
    ],
    impacts: [
      "combat doctrine",
      "healing access",
      "social status",
      "institutional control",
      "territorial power",
      "education systems",
      "religious authority",
      "daily labor",
      "border security",
      "resource control",
    ],
    consequences: [
      "corruption spread",
      "spell burnout",
      "artifact failure",
      "runaway mutations",
      "soul damage",
      "power monopolies",
      "ritual collapse",
      "mana drought",
      "summoning breaches",
      "loss of control",
    ],
  },
};

export const WORLD_ELEMENT_PROMPT_BANKS: Record<
  WorldCategoryKey,
  Record<string, WorldPromptBank>
> = {
  physical: attachTemplates("physical", {
    weather: bank(
      ["storm belts", "rain-shadow fronts"],
      ["barometric tides", "heat-sink currents"],
      ["shipping windows", "harvest timing"],
      ["flash-flood corridors", "storm migration"],
    ),
    terrain: bank(
      ["ridge networks", "basin shelves"],
      ["erosion feedback", "elevation bottlenecks"],
      ["settlement planning", "army movement"],
      ["landslide zones", "regional isolation"],
    ),
    flora: bank(
      ["canopy stratification", "seed-dormant forests"],
      ["spore cycles", "root-sharing symbiosis"],
      ["medicine gathering", "timber politics"],
      ["blight cascades", "food-web collapse"],
    ),
    fauna: bank(
      ["migration herds", "apex nesting grounds"],
      ["breeding routes", "predator balance"],
      ["hunting law", "transport animals"],
      ["stampede seasons", "predator spillover"],
    ),
    cosmology: bank(
      ["star path doctrine", "planetary alignments"],
      ["eclipse cycles", "orbital omens"],
      ["navigation calendars", "religious timing"],
      ["calendar drift", "omens-driven unrest"],
    ),
    "tectonic activity": bank(
      ["fault-step basins", "subduction scars"],
      ["pressure release chains", "magma uplift"],
      ["urban engineering", "mineral access"],
      ["quake swarms", "city subsidence"],
    ),
    climate: bank(
      ["rainbelt migration", "heat basin contrast"],
      ["ocean heat loops", "ice feedback"],
      ["crop zones", "regional architecture"],
      ["drought decades", "climate refugees"],
    ),
    visuals: bank(
      ["skyglow horizons", "mineral color bands"],
      ["light scattering", "bioluminescent cycles"],
      ["identity aesthetics", "camouflage strategies"],
      ["illusionary distance", "night disorientation"],
    ),
    oceans: bank(
      ["current gyres", "abyssal shelves"],
      ["tide resonance", "salinity belts"],
      ["trade fleets", "coastal economies"],
      ["dead zones", "shipwreck seasons"],
    ),
    seasons: bank(
      ["long thaw", "double monsoon"],
      ["solar tilt extremes", "lunar season locks"],
      ["festival calendars", "labor cycles"],
      ["famine winters", "missed planting windows"],
    ),
    geology: bank(
      ["sediment vaults", "crystal seams"],
      ["plate compression", "mineral weathering"],
      ["construction material", "excavation wealth"],
      ["sinkholes", "toxic runoff"],
    ),
    "natural disasters": bank(
      ["cyclone corridors", "firestorm fronts"],
      ["fuel buildup", "pressure collapse"],
      ["evacuation doctrine", "insurance customs"],
      ["mass displacement", "infrastructure loss"],
    ),
    "celestial bodies": bank(
      ["twin moons", "debris rings"],
      ["orbital drag", "tidal pull"],
      ["navigation lore", "night travel"],
      ["impact showers", "unstable tides"],
    ),
    rivers: bank(
      ["braided deltas", "seasonal headwaters"],
      ["silt loading", "floodplain recharge"],
      ["irrigation states", "river tolls"],
      ["bank collapse", "water-right conflicts"],
    ),
    coastlines: bank(
      ["cliff harbors", "mangrove estuaries"],
      ["tidal erosion", "storm surge carving"],
      ["port defense", "fishing towns"],
      ["salinization", "shore retreat"],
    ),
    caves: bank(
      ["karst labyrinths", "lava tube vaults"],
      ["dripstone growth", "underground runoff"],
      ["hidden settlements", "ore extraction"],
      ["air loss", "collapse pockets"],
    ),
    glaciers: bank(
      ["ice tongues", "meltwater shelves"],
      ["seasonal retreat", "glacial creep"],
      ["freshwater reserves", "mountain routes"],
      ["outburst floods", "vanishing ice roads"],
    ),
    soil: bank(
      ["black-earth belts", "ash-rich loam"],
      ["nutrient cycling", "microbe balance"],
      ["crop quality", "land value"],
      ["soil exhaustion", "dust storms"],
    ),
    "air quality": bank(
      ["smog basins", "clean-air corridors"],
      ["wind trapping", "spore density"],
      ["public health", "industrial zoning"],
      ["lung disease", "visibility blackouts"],
    ),
    "day-night cycle": bank(
      ["short dusk bands", "long polar nights"],
      ["tilt irregularity", "orbital shading"],
      ["work schedules", "predator activity"],
      ["sleep disorders", "security gaps"],
    ),
    "mineral deposits": bank(
      ["rare ore veins", "salt caverns"],
      ["hydrothermal deposition", "sediment trapping"],
      ["minting power", "weapon crafting"],
      ["mine collapse", "resource wars"],
    ),
    biomes: bank(
      ["stacked microclimates", "ecotone borders"],
      ["humidity traps", "species drift"],
      ["settlement specialization", "supply diversity"],
      ["invasive spread", "habitat fragmentation"],
    ),
    "water systems": bank(
      ["aquifer webs", "reservoir ladders"],
      ["gravity-fed channels", "recharge seepage"],
      ["city planning", "drought resilience"],
      ["contamination chains", "water theft"],
    ),
    "mountain ranges": bank(
      ["folded highlands", "snow passes"],
      ["avalanche cycles", "wind shadows"],
      ["border control", "mining enclaves"],
      ["pass closures", "isolation winters"],
    ),
    "volcanic zones": bank(
      ["caldera belts", "ash plains"],
      ["gas venting", "magma pressure"],
      ["fertile farmland", "sacred danger zones"],
      ["eruption exile", "ashfall collapse"],
    ),
  }),
  cultural: attachTemplates("cultural", {
    religion: bank(
      ["ancestor shrines", "living saints"],
      ["pilgrimage circuits", "sacrificial calendars"],
      ["moral law", "civic identity"],
      ["heresy purges", "schism violence"],
    ),
    economics: bank(
      ["credit houses", "ration markets"],
      ["tax farming", "price guilds"],
      ["class mobility", "trade leverage"],
      ["debt peonage", "market crashes"],
    ),
    borders: bank(
      ["marchland customs", "checkpoint towns"],
      ["passport rites", "patrol rotation"],
      ["migration rights", "smuggling routes"],
      ["border raids", "stateless communities"],
    ),
    "food lore": bank(
      ["ritual feasts", "scarcity kitchens"],
      ["seasonal preservation", "status ingredients"],
      ["family memory", "regional trade"],
      ["famine stigma", "ingredient monopolies"],
    ),
    fashion: bank(
      ["rank-coded textiles", "mourning colors"],
      ["sumptuary law", "artisan guild control"],
      ["court status", "gender performance"],
      ["black markets", "status resentment"],
    ),
    "gender roles": bank(
      ["workline expectations", "inheritance lines"],
      ["ritual duty assignment", "marriage law"],
      ["labor access", "family authority"],
      ["social exclusion", "domestic unrest"],
    ),
    military: bank(
      ["citizen levies", "professional orders"],
      ["oath chains", "frontier conscription"],
      ["border security", "political legitimacy"],
      ["war profiteering", "coup risk"],
    ),
    languages: bank(
      ["court dialects", "trade pidgins"],
      ["script reform", "oral transmission"],
      ["education access", "regional unity"],
      ["translation gaps", "identity fracture"],
    ),
    taboos: bank(
      ["unclean acts", "forbidden names"],
      ["public shaming", "purity tests"],
      ["social trust", "marriage eligibility"],
      ["witch hunts", "double lives"],
    ),
    "social hierarchy": bank(
      ["caste ladders", "merit salons"],
      ["birth records", "patronage networks"],
      ["office access", "marriage strategy"],
      ["class revolt", "institutional paralysis"],
    ),
    "rites of passage": bank(
      ["coming-age ordeals", "name-giving feasts"],
      ["public witnessing", "family sponsorship"],
      ["adult status", "community belonging"],
      ["outcast youth", "ritual corruption"],
    ),
    law: bank(
      ["case tablets", "customary courts"],
      ["precedent chains", "oath evidence"],
      ["property security", "state trust"],
      ["selective justice", "legal blackmail"],
    ),
    education: bank(
      ["temple schools", "apprentice houses"],
      ["exam gates", "mentor sponsorship"],
      ["bureaucratic access", "knowledge control"],
      ["elite capture", "illiteracy gaps"],
    ),
    governance: bank(
      ["council rule", "divine monarchy"],
      ["tax representation", "ritual mandate"],
      ["policy stability", "regional loyalty"],
      ["succession crisis", "corrupt patronage"],
    ),
    "trade routes": bank(
      ["caravan spines", "harbor leagues"],
      ["toll treaties", "convoy timing"],
      ["city wealth", "cultural exchange"],
      ["bottleneck wars", "pirate economies"],
    ),
    festivals: bank(
      ["harvest carnivals", "night vigils"],
      ["calendar decrees", "competitive patronage"],
      ["civic unity", "tourism income"],
      ["riot cover", "debt spending"],
    ),
    "family structure": bank(
      ["clan households", "foster networks"],
      ["inheritance arbitration", "elder councils"],
      ["child rearing", "land control"],
      ["succession feuds", "kin exile"],
    ),
    "funeral customs": bank(
      ["sky burials", "river sendoffs"],
      ["mourning periods", "ancestor registry"],
      ["grief rituals", "estate transfer"],
      ["grave theft", "inheritance conflict"],
    ),
    "hospitality codes": bank(
      ["guest rights", "sanctuary tables"],
      ["gift exchange", "host liability"],
      ["diplomatic trust", "traveler safety"],
      ["feud obligations", "abuse of sanctuary"],
    ),
    mythmaking: bank(
      ["hero cycles", "creation epics"],
      ["bardic revision", "state sponsorship"],
      ["national identity", "moral instruction"],
      ["historical erasure", "propaganda myths"],
    ),
    "storytelling traditions": bank(
      ["fireside sagas", "mask theater"],
      ["call-and-response", "licensed performers"],
      ["memory keeping", "regional prestige"],
      ["censorship", "stolen narratives"],
    ),
    "naming customs": bank(
      ["birth names", "earned titles"],
      ["ancestor repetition", "public renaming"],
      ["lineage status", "social intimacy"],
      ["identity fraud", "name taboos"],
    ),
    currency: bank(
      ["minted crowns", "labor scrip"],
      ["metal purity", "state exchange rates"],
      ["cross-border trade", "household savings"],
      ["counterfeiting", "inflation spirals"],
    ),
    "labor systems": bank(
      ["guild contracts", "seasonal corvee"],
      ["wage quotas", "debt service"],
      ["infrastructure growth", "worker power"],
      ["strikes", "bonded labor abuse"],
    ),
    citizenship: bank(
      ["birthright rolls", "service-based belonging"],
      ["oath registration", "residency proof"],
      ["voting rights", "legal protection"],
      ["disenfranchisement", "identity markets"],
    ),
    "urban etiquette": bank(
      ["street precedence", "market manners"],
      ["fines for insult", "district customs"],
      ["daily harmony", "merchant trust"],
      ["public duels", "status humiliation"],
    ),
    arts: bank(
      ["state murals", "guild opera"],
      ["patron commissions", "censorship boards"],
      ["cultural prestige", "collective memory"],
      ["suppressed voices", "art theft"],
    ),
    "diaspora identity": bank(
      ["memory quarters", "return festivals"],
      ["remittance networks", "dual loyalties"],
      ["transnational trade", "hybrid culture"],
      ["assimilation strain", "homeland suspicion"],
    ),
  }),
  magic: attachTemplates("magic", {
    "magic flow": bank(
      ["ley currents", "arcane tides"],
      ["convergence nodes", "seasonal surges"],
      ["spell reliability", "settlement placement"],
      ["wild-magic ruptures", "power deserts"],
    ),
    "energy source": bank(
      ["sunwell reserves", "bone-fed furnaces"],
      ["harvesting rites", "conversion matrices"],
      ["casting access", "state power"],
      ["resource exhaustion", "energy wars"],
    ),
    "spell system": bank(
      ["syntax casting", "gesture lattices"],
      ["grammar constraints", "sequence locking"],
      ["education barriers", "combat versatility"],
      ["miscast cascades", "forbidden schools"],
    ),
    corruption: bank(
      ["blight bloom", "soul tarnish"],
      ["overcasting exposure", "contaminated relics"],
      ["public fear", "medical demand"],
      ["mutations", "purge regimes"],
    ),
    artifacts: bank(
      ["bound relics", "sentient tools"],
      ["attunement oaths", "charge cycling"],
      ["elite advantage", "quest economies"],
      ["artifact theft", "bond backlash"],
    ),
    rituals: bank(
      ["circle rites", "communal invocations"],
      ["precision timing", "group synchronization"],
      ["public ceremony", "infrastructure magic"],
      ["ritual collapse", "mass backlash"],
    ),
    limitations: bank(
      ["range ceilings", "material bottlenecks"],
      ["casting fatigue", "ritual prerequisites"],
      ["strategic planning", "social inequality"],
      ["power hoarding", "failed interventions"],
    ),
    costs: bank(
      ["blood tolls", "memory loss"],
      ["equivalent exchange", "wear accumulation"],
      ["who can cast", "medical ethics"],
      ["exploitation", "self-ruin"],
    ),
    inheritance: bank(
      ["bloodline gifts", "ancestral marks"],
      ["gene-bound attunement", "family rites"],
      ["dynastic power", "marriage politics"],
      ["heir hunts", "inbreeding pressure"],
    ),
    "interaction with society": bank(
      ["licensed casters", "public warding"],
      ["civic permits", "ritual labor"],
      ["class status", "daily convenience"],
      ["civil backlash", "magic dependency"],
    ),
    "scaling system": bank(
      ["ranked circles", "tier breakthroughs"],
      ["trial advancement", "capacity thresholds"],
      ["institutional prestige", "military doctrine"],
      ["elitism", "reckless escalation"],
    ),
    "anti-magic": bank(
      ["null zones", "counterspell mesh"],
      ["disruption fields", "resonance cancellation"],
      ["prison security", "battlefield balance"],
      ["collateral outages", "arms races"],
    ),
    "magical institutions": bank(
      ["arcane colleges", "state thaumaturgy bureaus"],
      ["licensing exams", "research monopolies"],
      ["knowledge access", "policy influence"],
      ["corruption rings", "scholarly schism"],
    ),
    "side effects": bank(
      ["afterglow sickness", "dream leakage"],
      ["residual charge", "imperfect shielding"],
      ["public health", "ritual insurance"],
      ["stigmatization", "chronic instability"],
    ),
    "magic ecology": bank(
      ["spell-fed wetlands", "mana-eating predators"],
      ["ambient saturation", "species adaptation"],
      ["conservation law", "resource harvesting"],
      ["ecosystem collapse", "invasive arcana"],
    ),
    "access methods": bank(
      ["spoken keys", "tattooed channels"],
      ["initiation rites", "tool-mediated casting"],
      ["entry barriers", "regional style"],
      ["black-market access", "ritual injury"],
    ),
    divination: bank(
      ["omen pools", "probability threads"],
      ["scrying focus", "future bleed"],
      ["court strategy", "criminal investigation"],
      ["self-fulfilling panic", "prophecy fraud"],
    ),
    "healing magic": bank(
      ["bone knitting", "plague easing"],
      ["pain transfer", "cellular acceleration"],
      ["lifespan gaps", "battlefield medicine"],
      ["healing debt", "bio-magic addiction"],
    ),
    "illusion magic": bank(
      ["glamour veils", "memory overlays"],
      ["light bending", "perception hacking"],
      ["espionage", "performance culture"],
      ["identity collapse", "trust erosion"],
    ),
    summoning: bank(
      ["contract bindings", "threshold breaches"],
      ["name invocation", "anchor circles"],
      ["labor substitutes", "war beasts"],
      ["entity rebellion", "dimensional leaks"],
    ),
    warding: bank(
      ["protective sigils", "threshold seals"],
      ["layered runes", "renewal cycles"],
      ["home security", "border defense"],
      ["barrier failure", "false safety"],
    ),
    enchantments: bank(
      ["persistent charms", "condition-bound items"],
      ["imbued triggers", "maintenance charges"],
      ["craft economies", "domestic convenience"],
      ["curse drift", "dependency on enchanted goods"],
    ),
    "spirit bonds": bank(
      ["companion pacts", "ancestor tethering"],
      ["reciprocal vows", "emotion resonance"],
      ["guidance systems", "funeral practice"],
      ["possession risk", "bond grief"],
    ),
    "magic storage": bank(
      ["mana vaults", "portable batteries"],
      ["charge compression", "stability runes"],
      ["infrastructure scale", "siege endurance"],
      ["catastrophic release", "storage monopolies"],
    ),
    "elemental attunement": bank(
      ["fire lineages", "storm affinity"],
      ["temperament syncing", "environmental exposure"],
      ["trade specialization", "combat roles"],
      ["attunement imbalance", "ecological strain"],
    ),
    teleportation: bank(
      ["gate circles", "fold paths"],
      ["anchor beacons", "coordinate locking"],
      ["trade speed", "military mobility"],
      ["arrival drift", "smuggling explosions"],
    ),
    necromancy: bank(
      ["bone archives", "death-bound servitors"],
      ["grave contracts", "soul retention"],
      ["labor ethics", "mourning culture"],
      ["restless dead", "taboo economies"],
    ),
    "magic detection": bank(
      ["aura tracking", "resonance mapping"],
      ["scenting sigils", "reactive crystals"],
      ["law enforcement", "border inspection"],
      ["false accusations", "surveillance abuse"],
    ),
  }),
};
