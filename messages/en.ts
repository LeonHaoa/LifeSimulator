import type { Messages } from "@/lib/i18n/types";

const en: Messages = {
  common: {
    languageName: "English",
    loading: "Loading",
    back: "Back to welcome",
    audio: "Audio",
    sfx: "SFX",
    music: "Music",
  },
  welcome: {
    heroAlt: "Life Simulator welcome screen",
    start: "Start Life",
  },
  life: {
    title: "Life Journey",
    round: ({ round }) => `Round ${round}`,
    settled: "Settled",
    inProgress: "In progress",
    tagline: "Skill · Time · Narrative",
    createCharacter: {
      title: "Create Character",
      description:
        "Your eight starting attributes will be rolled from 0 to 100. Each year you assign skill points before the story advances.",
      placeholder: "Your name",
      submit: "Begin Life",
    },
    status: {
      title: "Character Status",
      summary: ({ name, age, max }) => `${name} · age ${age} · cap ${max} per stat`,
    },
    nextYear: {
      title: "Open the Next Year",
      gainHint: ({ nextAge, skillBudget, remaining }) =>
        `Next year (age ${nextAge}) lets you assign ${skillBudget} point(s), ${remaining} left.`,
      loseHint: ({ nextAge, remaining }) =>
        `Next year (age ${nextAge}) requires removing ${remaining} point(s), and no stat can drop below 0.`,
      noneHint: ({ nextAge }) => `Next year (age ${nextAge}) starts without skill points.`,
      start: "Open the Next Year",
      mustSpend: "Finish assigning points first",
      mustRemove: "Finish removing points first",
      opening: "Opening the next year...",
      openingCaption: "Between sunrise and sunset, you grew up a little more.",
      thisYear: "This Year...",
      generating: "Generating narrative",
      next: "Next Year",
      commandBarRelocated: "Controls moved to the command bar below",
    },
    almanac: {
      title: "Almanac",
      empty: "No records yet",
      localNarrative: "Local narrative",
      export: "Export Save JSON",
    },
    gameOver: {
      ended: "Life ended",
      badge: "Deceased",
      title: "The journey ends",
      subtitle: ({ age }) =>
        `Your story closes at age ${age}. This run is over, but the almanac remembers.`,
      hint: "You can still read the almanac or export your save.",
      acknowledge: "Continue",
      openAlmanac: "Open almanac",
      roundEnded: "Final chapter",
    },
  },
  errors: {
    streamReadFailed: "Unable to read streaming response",
    streamFailed: "Streaming narrative failed",
    missingFinalState: "Missing final game state",
    createCharacterFailed: "Failed to create character",
    requestFailed: "Request failed",
    invalidName: "Name must be 1 to 20 characters and may contain Chinese, letters, numbers, or middle dots.",
  },
  stats: {
    happiness: { label: "Happiness" },
    health: { label: "Health" },
    wealth: { label: "Wealth" },
    career: { label: "Career" },
    study: { label: "Study" },
    social: { label: "Social" },
    love: { label: "Love" },
    marriage: { label: "Marriage" },
  },
  events: {
    fallbackBreath: { title: "Another year somehow slipped by" },
    brick: { title: "You hauled bricks at the worksite" },
    debut: { title: "A talent scout handed you a card" },
    gaokao: { title: "Senior year towered over you in piles of exam papers" },
    tagBonusAfterWork: { title: "The foreman noticed your speed and gave you an extra meal box" },
    easterNameLong: { title: "Your long name earned half an extra line from a fortune teller" },
  },
  narrative: {
    idleLine: "Life keeps moving.",
    yearLine: ({ name, age, events }) => `${name} at age ${age}: ${events}.`,
    deathYear: ({ name, age }) =>
      `${name} did not reach the next sunrise — life closed the book at age ${age}. The run ends here; what remains is memory and the almanac you kept.`,
    skillFlavor: {
      happiness:
        "You put your effort into happiness, and this year your mind felt a little brighter and quicker to laugh.",
      health:
        "You paid closer attention to health, nudging your routine and mood just enough to make your body complain less.",
      wealth:
        "You bet on wealth, so you became a little sharper about money, with opportunity and stinginess arriving together.",
      career:
        "You invested in career, which bought you a little more presence at work and a little more risk of taking the blame.",
      study:
        "You spent your point on study, and your brain turned a few extra loops while the workload grew with it.",
      social:
        "You strengthened social ties, so dinner invites came more often and favors quietly started keeping score.",
      love:
        "You placed your point in love, where butterflies and misunderstandings took turns running the plot.",
      marriage:
        "You focused on marriage, so commitment and daily friction showed up in the same frame.",
    },
  },
  llm: {
    roleJson:
      "You are the yearly narrator and blunt but caring best friend in Life Simulator. The user will send JSON with the player's name, age, runSeed, current stats, yearly events, and optional skill focus. If lifeStatus is \"deceased\", write a brief, respectful end-of-life closing only — no future plans or next year.",
    rolePlain:
      "Write a single plain-text yearly narrative for Life Simulator using the provided JSON facts.",
    replyInEnglish: "Reply in English.",
    replyInChinese: "请用中文回复。",
    noLanguageMixing:
      "Do not mix Chinese and English in normal prose unless a proper noun or technical identifier must stay unchanged.",
  },
};

export default en;
