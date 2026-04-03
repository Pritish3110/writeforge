export interface TaskDefinition {
  id: string;
  title: string;
  category: string;
  prompt: string;
  steps: string[];
  durationMinutes: number;
  importantRules: string[];
  writingPrinciples: string[];
  review: string[];
  knowledgeTemplate?: {
    entityType: string;
    storageKey: string;
    fields: Array<{
      id: string;
      label: string;
      kind: "text" | "list";
    }>;
    linkableFields?: string[];
  };
}

export const DAILY_TASKS: Record<string, TaskDefinition[]> = {
  Monday: [
    {
      id: "mon-1",
      title: "Character Core",
      category: "Character",
      prompt: `Create a character profile:

- Define their deepest desire (what they want but cannot have)
- Identify their fatal flaw
- Add one contradiction
- Justify the contradiction using backstory`,
      steps: [
        "Define the character's deepest desire in specific, meaningful terms",
        "Identify the flaw that actively blocks that desire",
        "Add one contradiction that creates internal conflict",
        "Justify the contradiction with a backstory detail that explains the behavior",
      ],
      durationMinutes: 10,
      importantRules: [
        "Avoid vague traits (no 'kind', 'strong')",
        "Use precise, specific behaviors",
        "Contradiction must create INTERNAL conflict",
        "Flaw must actively block the desire",
      ],
      writingPrinciples: [
        "Character = Desire vs Limitation",
        "Flaws generate story tension",
        "Backstory must explain behavior",
      ],
      review: [
        "Is the desire specific and meaningful?",
        "Does the flaw prevent that desire?",
        "Does the contradiction feel natural (not forced)?",
      ],
    },
    {
      id: "mon-2",
      title: "Scene Writing (Pyramid)",
      category: "Prose",
      prompt: `Write a 150-200 word scene where:

- The character faces a small decision
- Their contradiction creates tension

Start with physical actions and environment, then transition into thoughts and emotions.`,
      steps: [
        "Open with physical actions and environment before moving inward",
        "Introduce the small decision that brings the contradiction into play",
        "Use at least 3 sensory details to anchor the moment",
        "Transition into thoughts and emotions without breaking the scene flow",
        "Keep the scene tight, focused, and within 150-200 words",
      ],
      durationMinutes: 10,
      importantRules: [
        "Begin with concrete actions (movement, environment)",
        "Use at least 3 sensory details",
        "Show emotion through behavior, not statements",
        "Keep scene tight and focused",
      ],
      writingPrinciples: [
        "Scene = Desire → Obstacle → Reaction",
        "Use Pyramid of Abstraction properly",
        "Emotion must emerge from action",
      ],
      review: [
        "Does the scene start concrete?",
        "Does it transition smoothly to internal thoughts?",
        "Is conflict visible without stating it?",
      ],
    },
    {
      id: "mon-3",
      title: "POV Rewrite",
      category: "Character",
      prompt: `Rewrite the same scene from another character's POV.
This character must misunderstand or misinterpret the main character's actions.`,
      steps: [
        "Choose a second POV character whose bias changes the scene",
        "Rewrite the moment through their tone, perception, and interpretation",
        "Show the misunderstanding clearly and make it believable",
        "Reshape the voice so the scene feels distinct from the original version",
      ],
      durationMinutes: 10,
      importantRules: [
        "Do NOT copy structure line-by-line",
        "Change tone, perception, and interpretation",
        "Emphasize bias and misunderstanding",
      ],
      writingPrinciples: [
        "Perspective shapes reality",
        "Truth != perception",
        "Same event → different meaning",
      ],
      review: [
        "Does the new POV change the meaning of the scene?",
        "Is the misunderstanding clear and believable?",
        "Does the voice feel distinct?",
      ],
    },
  ],
  Tuesday: [
    {
      id: "tue-1",
      title: "Emotion Breakdown",
      category: "Emotion",
      prompt: `Pick one emotion (grief, jealousy, quiet happiness).
Break it down into:

- Physical signs
- Internal thoughts
- External behavior

Do NOT write a full scene.`,
      steps: [
        "Choose one emotion: grief, jealousy, or quiet happiness",
        "List specific physical signs such as body tension, breath, or posture",
        "Write the internal thoughts that would accompany that emotion",
        "Describe the external behavior another person would notice",
        "Compare the internal and external layers for contrast",
      ],
      durationMinutes: 10,
      importantRules: [
        "No storytelling — only analysis",
        "Be specific (body, breath, posture)",
        "Avoid generic descriptors",
        "Focus on observable + internal contrast",
      ],
      writingPrinciples: [
        "Emotion = internal + external mismatch",
        "Behavior reveals more than labels",
        "Subtlety creates realism",
      ],
      review: [
        "Are physical signals specific?",
        "Do thoughts match the emotion?",
        "Is behavior consistent but not obvious?",
      ],
    },
    {
      id: "tue-2",
      title: "Scene Writing",
      category: "Emotion",
      prompt: `Write a scene conveying strong emotion using ONLY:

- Actions
- Sensory details
- Silence
- Small movements

Zero emotion words allowed.`,
      steps: [
        "Choose the emotion you want the reader to feel without naming it",
        "Build the scene using actions, sensory details, silence, and small movements only",
        "Use micro-actions such as hands, breath, pauses, or gaze shifts",
        "Let the environment reflect the emotional pressure of the moment",
        "Remove every emotion word and tighten any unnecessary detail",
      ],
      durationMinutes: 15,
      importantRules: [
        "Do NOT name the emotion",
        "Use micro-actions (hands, breath, pauses)",
        "Use environment to reflect emotion",
        "Keep focus tight (no unnecessary detail)",
      ],
      writingPrinciples: [
        "Show > Tell",
        "Emotion emerges from behavior",
        "Readers infer feelings",
      ],
      review: [
        "Are there any emotion words? (remove them)",
        "Does the emotion still come through clearly?",
        "Are sensory details doing the work?",
      ],
    },
    {
      id: "tue-3",
      title: "Review & Refinement",
      category: "Prose",
      prompt: "Review your scene and refine it for emotional clarity and immersion.",
      steps: [
        "Re-read your scene slowly",
        "Identify weak or generic lines",
        "Check sensory detail usage",
        "Apply pyramid of abstraction",
        "Rewrite 1-2 lines for improvement",
      ],
      durationMinutes: 5,
      importantRules: [
        "Cut anything unnecessary",
        "Replace generic actions with specific ones",
        "Ensure flow from concrete → abstract",
      ],
      writingPrinciples: [
        "Editing creates depth",
        "Strong writing = precise writing",
        "Less is often more",
      ],
      review: [
        "Does the scene feel immersive?",
        "Is the emotion clear without naming it?",
        "Does the flow feel natural?",
      ],
    },
  ],
  Wednesday: [
    {
      id: "wed-1",
      title: "Problem Setup",
      category: "Plot",
      prompt: `Create a story problem with a hard constraint.

Define:

- The situation
- The constraint (no tools, time limit, physical restriction, etc.)
- The stakes (what happens if they fail)

Make the stakes personal, not just situational.`,
      steps: [
        "Define a clear situation",
        "Add a hard constraint (limit options)",
        "Define failure consequence",
        "Make stakes emotionally personal",
        "Write a one-line problem summary",
      ],
      durationMinutes: 10,
      importantRules: [
        "Constraint must LIMIT obvious solutions",
        "Stakes must matter to the character personally",
        "Avoid vague problems",
        "The problem should force creativity",
      ],
      writingPrinciples: [
        "Strong stories = strong constraints",
        "Tension comes from limitation",
        "Personal stakes > external stakes",
      ],
      review: [
        "Is the constraint actually restrictive?",
        "Are the stakes personal or generic?",
        "Does the problem force creative thinking?",
      ],
    },
    {
      id: "wed-2",
      title: "Two Solutions",
      category: "Plot",
      prompt: `Create TWO solutions:

- One obvious (expected)
- One creative (unexpected but logical)

The creative solution should feel surprising but inevitable in hindsight.`,
      steps: [
        "Write the obvious solution",
        "Identify why it might fail or be risky",
        "Create an unexpected alternative",
        "Connect it to existing details",
        "Test believability",
      ],
      durationMinutes: 10,
      importantRules: [
        "The creative solution must NOT be random",
        "It must use setup elements",
        "Avoid 'magic fixes'",
        "It should feel earned",
      ],
      writingPrinciples: [
        "Setup → Payoff is critical",
        "Cleverness comes from constraints",
        "Surprise must still feel logical",
      ],
      review: [
        "Does the creative solution feel earned?",
        "Does it connect to earlier elements?",
        "Is it both surprising AND logical?",
      ],
    },
    {
      id: "wed-3",
      title: "Scene Execution",
      category: "Prose",
      prompt: `Write a scene where the character attempts the solution.

Include:

- Attempt
- Complication (failure or twist)
- Outcome

Follow: Promise → Progress → Payoff`,
      steps: [
        "Start with the character's intent (promise)",
        "Show the attempt in action (progress)",
        "Introduce complication or failure",
        "Deliver outcome or new stakes",
        "Keep pacing tight",
      ],
      durationMinutes: 10,
      importantRules: [
        "Force a twist OR failure (no easy success)",
        "Maintain tension throughout",
        "Avoid over-explaining",
        "Keep action clear and focused",
      ],
      writingPrinciples: [
        "Conflict drives scenes",
        "Failure is more interesting than success",
        "Payoff must connect to setup",
      ],
      review: [
        "Does the scene follow promise → progress → payoff?",
        "Is there a real complication or twist?",
        "Does the ending feel earned?",
      ],
    },
  ],
  Thursday: [
    {
      id: "thu-1",
      title: "Fight Design",
      category: "Action",
      prompt: `Design a fight before writing it.

Define:

- Each fighter's goal
- Stakes (what changes if they win/lose)
- Environment (how it affects movement)
- Emotional core (why this fight matters)`,
      steps: [
        "Define both fighters' goals",
        "Establish stakes clearly",
        "Choose environment + usable elements",
        "Decide how environment affects tactics",
        "Identify emotional core",
      ],
      durationMinutes: 10,
      importantRules: [
        "Every action must serve a goal",
        "Environment must be usable (not decorative)",
        "Avoid generic fights — define uniqueness",
        "Conflict must be clear at all times",
      ],
      writingPrinciples: [
        "Action = goal-driven movement",
        "Environment creates strategy",
        "Stakes create tension",
      ],
      review: [
        "Are both fighters' goals clear?",
        "Is the environment actively usable?",
        "Does the fight have a clear purpose?",
      ],
    },
    {
      id: "thu-2",
      title: "Fight Scene Writing",
      category: "Action",
      prompt: `Write a fight scene using:

- Clear action beats
- Internal strategy
- Environment interaction

Focus on pacing and readability.`,
      steps: [
        "Write action beats (one action per line/sentence)",
        "Insert short internal thoughts (strategy)",
        "Use environment actively (movement, cover, weapons)",
        "Shorten sentences during intense moments",
        "Remove unnecessary description",
      ],
      durationMinutes: 15,
      importantRules: [
        "One action = one beat",
        "Keep motion clear (reader must visualize easily)",
        "Avoid long sentences during combat",
        "No clutter — clarity over detail",
      ],
      writingPrinciples: [
        "Rhythm controls tension",
        "Short sentences = speed",
        "Clear beats = immersive action",
      ],
      review: [
        "Can you clearly visualize every movement?",
        "Are sentences shorter during action peaks?",
        "Is the fight easy to follow?",
      ],
    },
    {
      id: "thu-3",
      title: "Emotion Layer",
      category: "Emotion",
      prompt: `Enhance the fight by embedding emotion into action.

Show internal stakes through:

- Breath
- Hesitation
- Focus shifts
- Micro-reactions`,
      steps: [
        "Identify emotional driver (fear, rage, desperation)",
        "Add micro physical signals (breath, grip, hesitation)",
        "Insert brief internal reactions",
        "Blend emotion into action (not separate)",
      ],
      durationMinutes: 5,
      importantRules: [
        "Emotion must appear THROUGH action",
        "No direct emotional statements",
        "Keep additions subtle and precise",
        "Do NOT slow down pacing",
      ],
      writingPrinciples: [
        "Emotion + action = impact",
        "Micro-details create realism",
        "Internal stakes deepen scenes",
      ],
      review: [
        "Is emotion visible through behavior?",
        "Does it enhance the fight without slowing it?",
        "Does the reader feel the stakes?",
      ],
    },
  ],
  Friday: [
    {
      id: "fri-1",
      title: "Character Voice Design",
      category: "Dialogue",
      prompt: `Create 3 characters with clearly distinct speaking styles.

Define for each:

- Sentence rhythm (short / long / fragmented)
- Vocabulary type (formal, blunt, poetic, casual)
- What they avoid saying (secrets, emotions, truths)
- How they indirectly reveal emotion`,
      steps: [
        "Create 3 characters with different backgrounds",
        "Define sentence rhythm for each",
        "Assign vocabulary style",
        "Define what each character avoids saying",
        "Add 1 example line per character",
      ],
      durationMinutes: 10,
      importantRules: [
        "Voice = rhythm + word choice + avoidance",
        "Each character must sound unique WITHOUT context",
        "Avoid generic dialogue patterns",
        "Subtext matters more than direct speech",
      ],
      writingPrinciples: [
        "What is NOT said defines character",
        "Rhythm creates identity",
        "Word choice reflects background",
      ],
      review: [
        "Can you identify each character from one line alone?",
        "Do they sound distinct even without names?",
        "Does each voice reflect personality?",
      ],
    },
    {
      id: "fri-2",
      title: "Dialogue Scene",
      category: "Dialogue",
      prompt: `Write a dialogue scene where two characters want the same thing but both cannot have it.

Constraints:

- No dialogue tags
- Voices must be distinct
- Conflict must escalate
- Use subtext (don't say things directly)`,
      steps: [
        "Define what both characters want",
        "Start conversation casually",
        "Gradually introduce tension",
        "Use interruptions / deflection / indirect speech",
        "End with unresolved tension or shift",
      ],
      durationMinutes: 15,
      importantRules: [
        "No direct statements of intent",
        "Use subtext — say one thing, mean another",
        "Interruptions create realism",
        "Avoid exposition-heavy dialogue",
      ],
      writingPrinciples: [
        "Dialogue = conflict",
        "Subtext creates depth",
        "Tension builds through progression",
      ],
      review: [
        "Can you feel tension rising?",
        "Are characters speaking indirectly?",
        "Is conflict clear without being stated?",
      ],
    },
    {
      id: "fri-3",
      title: "Voice Check",
      category: "Dialogue",
      prompt: "Test whether your dialogue voices are truly distinct.",
      steps: [
        "Read dialogue aloud",
        "Cover speaker identities",
        "Try to identify each speaker",
        "Mark interchangeable lines",
        "Rewrite weak lines",
      ],
      durationMinutes: 5,
      importantRules: [
        "If voices sound similar → they are weak",
        "Each line must carry identity",
        "Remove generic phrasing",
        "Avoid neutral tone",
      ],
      writingPrinciples: [
        "Strong voices are unmistakable",
        "Dialogue must reveal character",
        "Clarity > cleverness",
      ],
      review: [
        "Can you identify speakers instantly?",
        "Do any lines feel interchangeable?",
        "Does each character sound consistent?",
      ],
    },
  ],
  Saturday: [
    {
      id: "sat-1",
      title: "World Element Selection",
      category: "World",
      prompt: `Design ONE world element (physical or cultural).

Define:

- How it works (mechanics)
- Who it affects (groups, individuals)
- What it costs (trade-offs, consequences)

Goal:
The element must feel usable in a story, not just interesting`,
      steps: [
        "Choose one element (magic, system, culture, rule)",
        "Define how it works in clear terms",
        "Identify who benefits and who suffers",
        "Establish a meaningful cost or limitation",
        "Connect it to potential story conflict",
      ],
      durationMinutes: 15,
      importantRules: [
        "No vague systems — define clearly",
        "Every power must have a cost",
        "Avoid generic fantasy/sci-fi tropes",
      ],
      writingPrinciples: [
        "Good worldbuilding creates conflict",
        "Systems must affect characters directly",
        "Constraints make worlds believable",
      ],
      review: [
        "Is the system clearly understandable?",
        "Who is impacted and how?",
        "Is there a real cost or limitation?",
        "Can this element generate conflict in a story?",
      ],
      knowledgeTemplate: {
        entityType: "worldElement",
        storageKey: "world-elements",
        fields: [
          { id: "elementType", label: "Element Type", kind: "text" },
          { id: "mechanics", label: "Mechanics", kind: "text" },
          { id: "affectedGroups", label: "Affected Groups", kind: "list" },
          { id: "costs", label: "Costs", kind: "list" },
          { id: "limitations", label: "Limitations", kind: "list" },
          { id: "storyConflicts", label: "Story Conflicts", kind: "list" },
        ],
        linkableFields: ["affectedGroups", "storyConflicts"],
      },
    },
    {
      id: "sat-2",
      title: "Scene Through Character POV",
      category: "World",
      prompt: `Write a short scene showing the world element ONLY through a character's experience.

Constraints:

- No info dumping
- World must be filtered through character perception
- Environment must reflect internal state`,
      steps: [
        "Choose a character interacting with the element",
        "Show the element through action and sensory experience",
        "Reveal rules indirectly (not explanation)",
        "Let the character's emotions shape perception",
        "Keep the scene grounded in physical interaction",
      ],
      durationMinutes: 15,
      importantRules: [
        "Show the world, don't explain it",
        "Avoid exposition or narration dumps",
        "Every detail must come through the character",
      ],
      writingPrinciples: [
        "Worldbuilding is strongest through perspective",
        "Emotion filters perception",
        "Interaction > explanation",
      ],
      review: [
        "Is the world revealed without explanation?",
        "Does the character's perspective shape the scene?",
        "Any info dumping present? Remove it",
        "Does the world feel alive and interactive?",
      ],
      knowledgeTemplate: {
        entityType: "worldSceneObservation",
        storageKey: "world-scene-observations",
        fields: [
          { id: "characterId", label: "Character", kind: "text" },
          { id: "relatedElementIds", label: "Related World Elements", kind: "list" },
          { id: "sensoryDetails", label: "Sensory Details", kind: "list" },
          { id: "perceptionLens", label: "Perception Lens", kind: "text" },
          { id: "emotionalState", label: "Emotional State", kind: "text" },
          { id: "physicalInteraction", label: "Physical Interaction", kind: "text" },
        ],
        linkableFields: ["relatedElementIds"],
      },
    },
  ],
  Sunday: [
    {
      id: "sun-1",
      title: "Description Drill",
      category: "Prose",
      prompt: `Write ONE paragraph showing a character performing a single clear action.

Constraints:

- Decide who is observing (POV clarity)
- Use all 5 senses (only where natural)
- Show action and internal state simultaneously
- Description must reveal BOTH subject and observer`,
      steps: [
        "Choose the observer (who is describing)",
        "Define one clear physical action",
        "Layer in sensory details (only relevant ones)",
        "Show internal state through action",
        "Ensure the observer's personality leaks into description",
      ],
      durationMinutes: 10,
      importantRules: [
        "Description must reveal perspective",
        "Avoid generic sensory overload",
        "Every detail must serve meaning",
      ],
      writingPrinciples: [
        "Good prose = selective detail, not more detail",
        "Action and emotion must coexist",
        "POV shapes reality",
      ],
      review: [
        "Can we tell who is observing?",
        "Does every detail serve a purpose?",
        "Is action + emotion happening together?",
        "Any unnecessary sensory detail? Remove it.",
      ],
    },
    {
      id: "sun-2",
      title: "Pyramid Practice",
      category: "Prose",
      prompt: `Rewrite the SAME paragraph in three versions:

- Version A -> Highly Concrete (pure action, physicality)
- Version B -> Balanced (target voice)
- Version C -> More Abstract (thoughts, meaning, interpretation)`,
      steps: [
        "Write Version A -> strip to physical action",
        "Write Version B -> balance concrete + abstract",
        "Write Version C -> emphasize thoughts and meaning",
        "Compare all three versions",
        "Identify your ideal writing balance",
      ],
      durationMinutes: 10,
      importantRules: [
        "Do NOT change the core action",
        "Only change level of abstraction",
        "Keep consistency across versions",
      ],
      writingPrinciples: [
        "Control over abstraction = control over tone",
        "Balance creates readability",
        "Extremes help define your style",
      ],
      review: [
        "Which version feels strongest? Why?",
        "Is Version B truly balanced?",
        "Are A and C clearly distinct?",
        "What is your preferred abstraction level?",
      ],
    },
    {
      id: "sun-3",
      title: "Detail Enhancement",
      category: "Prose",
      prompt: `Take Version B and refine it using high-impact micro-details.

Add:

- Subtle body signals (hands, breath, posture)
- Focus shifts (what the character notices)
- Environmental interaction (texture, sound, resistance)

Goal:
Increase intensity WITHOUT increasing length unnecessarily`,
      steps: [
        "Start with Version B",
        "Replace generic details with precise ones",
        "Add 1-2 micro body signals",
        "Add one environmental interaction",
        "Remove any redundant wording",
      ],
      durationMinutes: 10,
      importantRules: [
        "Replace, don't just add",
        "Precision > quantity",
        "Avoid clutter",
      ],
      writingPrinciples: [
        "Strong prose comes from specificity",
        "Micro-details create immersion",
        "Editing improves writing more than drafting",
      ],
      review: [
        "Did the paragraph become sharper, not longer?",
        "Are details specific and intentional?",
        "Any clutter introduced? Remove it.",
        "Does the scene feel more alive now?",
      ],
    },
  ],
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const getDayName = (date: Date = new Date()): string => {
  return DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
};

export type PromptTone = "dark" | "emotional" | "action" | "mystery";
export type StoryPhase = "Promise" | "Progress" | "Payoff";

export interface PromptTemplate {
  id: string;
  template: string;
  tags: string[];
}

export const PROMPT_TONES: PromptTone[] = ["dark", "emotional", "action", "mystery"];
export const STORY_PHASES: StoryPhase[] = ["Promise", "Progress", "Payoff"];

export const PROMPT_LIBRARY: Record<PromptTone, PromptTemplate[]> = {
  dark: [
    {
      id: "dark_001",
      template:
        "{character} arrives at {location} during the {phase} phase and realizes {conflict}. They must decide whether to {choice} before {stakes}. Let the scene steep in {emotion}, and show how {innerPressure}.",
      tags: ["dark", "psychological", "decision"],
    },
    {
      id: "dark_002",
      template:
        "{character} thought {location} would be safe, but {twist}. Frame the scene as a {phase} beat where {conflict} cannot be ignored any longer. Make every line feel heavier because {traitHint}.",
      tags: ["dark", "dread", "revelation"],
    },
    {
      id: "dark_003",
      template:
        "Set the scene in {location}. During the {phase} phase, {character} is forced into a private conversation about {conflict}. They can either {choice} or let {stakes} happen. Keep the emotional current rooted in {emotion}.",
      tags: ["dark", "dialogue", "pressure"],
    },
    {
      id: "dark_004",
      template:
        "{character} notices something wrong at {location} during the {phase} phase, and the wrongness links back to {conflict}. Build the scene around one irreversible choice: {choice}. By the end, it should feel clear that {stakes}, especially because {innerPressure}.",
      tags: ["dark", "atmosphere", "irreversible-choice"],
    },
    {
      id: "dark_005",
      template:
        "{character} returns to {location} and finds proof of {conflict}. Treat this as a {phase} scene with {emotion} under every action. The scene should turn when {twist}, forcing them to {choice}.",
      tags: ["dark", "return", "twist"],
    },
    {
      id: "dark_006",
      template:
        "Write a low-light, close-focus scene at {location}. During the {phase} phase, {character} must hide their reaction to {conflict} while deciding whether to {choice}. Let the dread sharpen because {traitHint}.",
      tags: ["dark", "close-focus", "masking"],
    },
    {
      id: "dark_007",
      template:
        "{character} is offered exactly what they thought they wanted at {location}, but the price is {conflict}. Place the scene in the {phase} phase and make the choice immediate: {choice}, or {stakes}. The mood should be heavy with {emotion}.",
      tags: ["dark", "temptation", "cost"],
    },
    {
      id: "dark_008",
      template:
        "During the {phase} phase, {character} witnesses {twist} at {location}. That moment makes {conflict} impossible to deny. Show them weighing whether to {choice} while {innerPressure}.",
      tags: ["dark", "witness", "moral-pressure"],
    },
  ],
  emotional: [
    {
      id: "emotional_001",
      template:
        "{character} meets someone important at {location} during the {phase} phase, and the reunion is shaped by {conflict}. They must decide whether to {choice} before {stakes}. Let the scene center on {emotion}, with {traitHint}.",
      tags: ["emotional", "reunion", "choice"],
    },
    {
      id: "emotional_002",
      template:
        "Set the scene in {location}. During the {phase} phase, {character} tries to say what matters, but {twist}. Keep the heart of the scene focused on {conflict}, and show how {innerPressure}.",
      tags: ["emotional", "confession", "heart"],
    },
    {
      id: "emotional_003",
      template:
        "{character} is given a quiet moment at {location} during the {phase} phase, but the quiet only sharpens {conflict}. Build the scene around whether they will {choice}. The emotional texture should feel like {emotion}.",
      tags: ["emotional", "quiet-scene", "internal"],
    },
    {
      id: "emotional_004",
      template:
        "Write a scene where {character} must offer comfort at {location}, even though {conflict} is still unresolved. Treat it as a {phase} beat where {stakes}. Let the tenderness hurt because {traitHint}.",
      tags: ["emotional", "comfort", "bittersweet"],
    },
    {
      id: "emotional_005",
      template:
        "{character} finds a small object at {location} that brings back {conflict}. During the {phase} phase, they must choose whether to {choice}. The scene should carry {emotion}, and the turn should come when {twist}.",
      tags: ["emotional", "memory", "object"],
    },
    {
      id: "emotional_006",
      template:
        "At {location}, {character} realizes someone else has been carrying {conflict} in silence. Frame this as a {phase} scene that asks them to {choice} before {stakes}. Keep the emotional rhythm intimate and layered with {emotion}.",
      tags: ["emotional", "realization", "intimate"],
    },
    {
      id: "emotional_007",
      template:
        "{character} arrives late to {location} during the {phase} phase and discovers {twist}. The scene should force them to confront {conflict} and decide whether to {choice}. Make their restraint or openness matter because {innerPressure}.",
      tags: ["emotional", "lateness", "restraint"],
    },
    {
      id: "emotional_008",
      template:
        "Write an emotionally precise scene at {location}. During the {phase} phase, {character} has one chance to respond to {conflict}. Let the main movement of the scene be their choice to {choice}, while {traitHint}.",
      tags: ["emotional", "precision", "response"],
    },
  ],
  action: [
    {
      id: "action_001",
      template:
        "{character} hits {location} during the {phase} phase just as {conflict} turns physical. They must {choice} before {stakes}. Keep the scene fast, tactile, and charged with {emotion}, while {traitHint}.",
      tags: ["action", "momentum", "physical"],
    },
    {
      id: "action_002",
      template:
        "Write a high-pressure scene in {location}. During the {phase} phase, {character} realizes {twist} and has seconds to respond. Force them to choose whether to {choice}, because {stakes}.",
      tags: ["action", "high-pressure", "seconds"],
    },
    {
      id: "action_003",
      template:
        "{character} is already moving when the scene opens at {location}. Treat it as a {phase} beat where {conflict} changes the plan mid-motion. Show the split-second choice to {choice}, and let {innerPressure} complicate every move.",
      tags: ["action", "opening-motion", "plan-change"],
    },
    {
      id: "action_004",
      template:
        "At {location}, {character} is forced into a fight, chase, or escape because of {conflict}. Frame the scene around the {phase} phase of the story and make the turning point their decision to {choice}. The urgency should feel like {emotion}.",
      tags: ["action", "escape", "turning-point"],
    },
    {
      id: "action_005",
      template:
        "{character} enters {location} with a clear objective, but {twist}. During the {phase} phase, they must improvise around {conflict} and decide whether to {choice} before {stakes}.",
      tags: ["action", "objective", "improvise"],
    },
    {
      id: "action_006",
      template:
        "Write a scene where the body leads the emotion. In {location}, during the {phase} phase, {character} has to react to {conflict} immediately. Build the whole scene around the cost of choosing to {choice}.",
      tags: ["action", "body-first", "cost"],
    },
    {
      id: "action_007",
      template:
        "{character} thought the danger at {location} was external, but {twist}. Use the {phase} phase to escalate {conflict} and force a visible choice: {choice}. Keep the energy sharp because {traitHint}.",
      tags: ["action", "escalation", "visible-choice"],
    },
    {
      id: "action_008",
      template:
        "Set the scene in {location}. During the {phase} phase, {character} must protect someone, retrieve something, or break through an obstacle while {conflict}. The scene should pivot on whether they will {choice} before {stakes}.",
      tags: ["action", "mission", "obstacle"],
    },
  ],
  mystery: [
    {
      id: "mystery_001",
      template:
        "{character} reaches {location} during the {phase} phase and discovers {conflict}. Treat the scene as a clue-heavy beat where they must decide whether to {choice} before {stakes}. Let the tension stay rooted in {emotion}.",
      tags: ["mystery", "clue", "discovery"],
    },
    {
      id: "mystery_002",
      template:
        "Write a scene at {location} where {character} realizes {twist}. During the {phase} phase, they must test whether {conflict} is real or staged. Their next move is to {choice}, and that choice should reshape the investigation.",
      tags: ["mystery", "realization", "investigation"],
    },
    {
      id: "mystery_003",
      template:
        "{character} questions someone at {location} during the {phase} phase, but the real pressure comes from {conflict}. Let the scene revolve around the choice to {choice}, with every answer deepening {emotion}.",
      tags: ["mystery", "interrogation", "subtext"],
    },
    {
      id: "mystery_004",
      template:
        "At {location}, {character} finds evidence that points in two opposite directions. Place the scene in the {phase} phase and make {conflict} the thing they cannot explain away. The turn comes when {twist}.",
      tags: ["mystery", "evidence", "double-meaning"],
    },
    {
      id: "mystery_005",
      template:
        "{character} enters {location} looking for one answer and instead uncovers {conflict}. During the {phase} phase, they must decide whether to {choice} before {stakes}. Let {traitHint} complicate what they notice first.",
      tags: ["mystery", "search", "observation"],
    },
    {
      id: "mystery_006",
      template:
        "Write a scene where {location} itself feels like a clue. During the {phase} phase, {character} starts to suspect {conflict}. The scene should tighten when {twist}, forcing them to {choice}.",
      tags: ["mystery", "setting-clue", "suspect"],
    },
    {
      id: "mystery_007",
      template:
        "{character} notices one detail at {location} that nobody else treats as important. Treat it as a {phase} beat where {conflict} might explain everything. The next decision is whether to {choice}, even though {stakes}.",
      tags: ["mystery", "detail", "pattern"],
    },
    {
      id: "mystery_008",
      template:
        "During the {phase} phase, {character} returns to {location} to verify a suspicion and finds {twist}. Build the scene around their attempt to make sense of {conflict}, with {innerPressure} shaping how they read the room.",
      tags: ["mystery", "return", "suspicion"],
    },
  ],
};

export const PROMPT_CONFLICTS: Record<PromptTone, string[]> = {
  dark: [
    "a truth they cannot accept",
    "a hidden betrayal that has been festering for years",
    "the first clear sign of corruption inside themselves",
    "proof that the safest person in the room is part of the harm",
    "the possibility that their worst instinct was right all along",
    "evidence that mercy may cost more than cruelty",
  ],
  emotional: [
    "an apology that arrives too late",
    "the fear that love and resentment can exist at the same time",
    "a promise neither person knows how to keep anymore",
    "the pain of being seen too clearly",
    "the moment they understand what the other person needed from them",
    "the choice between protecting someone and telling them the truth",
  ],
  action: [
    "an ambush timed to their weakest moment",
    "a plan collapsing under live pressure",
    "an enemy who understands exactly how they fight",
    "a narrow window before reinforcements arrive",
    "a rescue turning into a trap",
    "the realization that speed alone will not save anyone",
  ],
  mystery: [
    "a clue that should not exist",
    "a contradiction in the official story",
    "a witness account that only makes the case stranger",
    "evidence planted to look too obvious",
    "a pattern linking two events that should be unrelated",
    "the possibility that the wrong person has been protected on purpose",
  ],
};

export const PROMPT_LOCATIONS: Record<PromptTone, string[]> = {
  dark: [
    "a shuttered church with ash in the aisles",
    "an abandoned greenhouse overrun with black vines",
    "a family dining room after midnight",
    "a rain-soaked alley behind a theater",
    "a ruined observatory where the lenses still turn",
    "a silent infirmary lit by one failing lamp",
  ],
  emotional: [
    "a train platform just before dawn",
    "the kitchen of a house that no longer feels like home",
    "a hospital rooftop in cold morning light",
    "a half-empty wedding hall after the guests leave",
    "a riverside bench where they used to meet",
    "a small bookstore during closing time",
  ],
  action: [
    "a collapsing bridge above floodwater",
    "a crowded market breaking into panic",
    "a freight yard full of moving trains",
    "a stairwell with alarms blaring",
    "a rooftop line above a neon district",
    "a mountain pass choked with smoke",
  ],
  mystery: [
    "an archive room with one file missing",
    "a locked apartment that smells recently occupied",
    "a museum wing closed to the public",
    "a harbor warehouse with fresh footprints in old dust",
    "a village square after everyone has gone indoors",
    "a library map room where one drawer is warm",
  ],
};

export const PROMPT_EMOTIONS: Record<PromptTone, string[]> = {
  dark: ["slow dread", "hollow disgust", "quiet panic", "moral nausea", "cold grief", "suppressed terror"],
  emotional: ["tender grief", "aching relief", "muted hope", "protective love", "raw vulnerability", "bittersweet longing"],
  action: ["ferocious urgency", "controlled panic", "adrenaline-laced focus", "barely contained fury", "reckless resolve", "protective desperation"],
  mystery: ["uneasy curiosity", "measured suspicion", "paranoid focus", "eerie fascination", "cautious dread", "quiet obsession"],
};

export const PROMPT_STAKES: Record<PromptTone, string[]> = {
  dark: [
    "someone innocent will carry the blame before dawn",
    "the damage will become impossible to hide",
    "the last safe relationship in their life will rot from the inside",
    "they will become the thing they fear most",
    "the truth will only surface after someone is already broken",
    "the room will keep teaching them the wrong lesson",
  ],
  emotional: [
    "the relationship they still care about will close for good",
    "the chance to repair the bond may never return",
    "someone will walk away believing the wrong thing",
    "their silence will wound more deeply than honesty",
    "the distance between them will harden into something permanent",
    "they will miss the one moment that could soften the hurt",
  ],
  action: [
    "the person they came to protect will be lost in the chaos",
    "the route out will vanish in seconds",
    "their team will fracture at the worst possible moment",
    "the enemy will seize the objective first",
    "the damage will spread beyond this fight",
    "their only advantage will disappear",
  ],
  mystery: [
    "the only witness will disappear before sunrise",
    "the real culprit will have time to erase the trail",
    "the wrong suspect will be punished next",
    "the truth will bury itself under a cleaner lie",
    "the pattern will strike again before anyone believes them",
    "the clue they found will be meaningless by morning",
  ],
};

export const PROMPT_TWISTS: Record<PromptTone, string[]> = {
  dark: [
    "the danger has already been invited in by someone they trust",
    "the evidence points back to something they did themselves",
    "the person asking for help knows more than they admit",
    "the room has been staged to provoke the worst version of them",
    "what looks like protection is really control",
    "the thing they feared was true, just not in the way they expected",
  ],
  emotional: [
    "the other person has been trying to protect them all along",
    "the memory they were holding onto is incomplete",
    "the gesture they dismissed was the apology",
    "both people have been making the same mistake from different wounds",
    "the goodbye they prepared for turns into a plea to stay",
    "the kindness in the scene costs someone more than it first appears",
  ],
  action: [
    "their ally is cut off from the plan",
    "the objective is not where it was supposed to be",
    "the person chasing them is trying to warn them",
    "the escape path is the trap",
    "the fight stops being about winning and starts being about choosing who to save",
    "their best move exposes a second threat",
  ],
  mystery: [
    "the clue was planted by someone who wanted exactly this conclusion",
    "the witness recognizes them before they speak",
    "the answer to one question opens a more dangerous one",
    "the missing piece has been in plain sight all along",
    "the person helping the investigation is shaping it from the shadows",
    "the timeline only works if someone lied about being present",
  ],
};

export const PROMPT_CHOICES: Record<PromptTone, string[]> = {
  dark: [
    "protect the lie that kept them alive",
    "force the truth into the open before they are ready",
    "burn the evidence and keep moving",
    "stay and face the person they fear most",
    "save someone who may not deserve it",
    "let the worst assumption stand if it buys one more hour",
  ],
  emotional: [
    "say the one honest thing they have been avoiding",
    "offer comfort before asking for forgiveness",
    "leave before the moment asks more of them",
    "admit what they needed all along",
    "choose tenderness over self-protection",
    "tell the truth even if it ruins the version of the past they both survived on",
  ],
  action: [
    "risk a direct assault instead of the safer escape",
    "double back for the person who was left behind",
    "break formation and trust instinct",
    "sacrifice the clean plan for the messy rescue",
    "hold the line long enough for someone else to get through",
    "turn the enemy's momentum against them before time runs out",
  ],
  mystery: [
    "follow the clue nobody else believes",
    "confront the witness before the evidence is complete",
    "keep the discovery secret for one more scene",
    "test the wrong theory on purpose to see who reacts",
    "return to the scene and risk being seen",
    "share the clue with exactly one unreliable ally",
  ],
};

export const WRITING_PROMPTS = [
  "Write about a door that should never be opened.",
  "A character discovers a letter they wrote but do not remember writing.",
  "Two strangers share an umbrella during a storm. Neither speaks the other's language.",
  "Write a scene set entirely in an elevator between floors.",
  "A character returns to their childhood home to find someone else living their life.",
  "Write about the last conversation between two people who will never see each other again.",
  "Describe a city where memories are currency.",
  "A character wakes up with someone else's scars.",
  "Write about a promise that took twenty years to keep.",
  "Two rivals are forced to work together to survive the night.",
  "A character finds a journal that predicts tomorrow's events, but it is always slightly wrong.",
  "Write about a feast where every dish tells a story.",
];

export const CATEGORIES = ["Character", "Emotion", "Plot", "Dialogue", "Action", "World", "Prose"];
