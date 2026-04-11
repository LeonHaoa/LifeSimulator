export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type InterpolationValues = Record<string, string | number>;

export type MessageTemplate = (params: InterpolationValues) => string;

export type Messages = {
  common: {
    languageName: string;
    loading: string;
    back: string;
    audio: string;
    sfx: string;
    music: string;
  };
  welcome: {
    heroAlt: string;
    start: string;
  };
  life: {
    title: string;
    round: MessageTemplate;
    settled: string;
    inProgress: string;
    tagline: string;
    createCharacter: {
      title: string;
      description: string;
      placeholder: string;
      submit: string;
    };
    status: {
      title: string;
      summary: MessageTemplate;
    };
    nextYear: {
      title: string;
      gainHint: MessageTemplate;
      loseHint: MessageTemplate;
      noneHint: MessageTemplate;
      start: string;
      mustSpend: string;
      mustRemove: string;
      opening: string;
      openingCaption: string;
      thisYear: string;
      generating: string;
      next: string;
      /** Shown on disabled placeholder when skill UI is duplicated in command bar. */
      commandBarRelocated: string;
    };
    almanac: {
      title: string;
      empty: string;
      localNarrative: string;
      export: string;
    };
    gameOver: {
      ended: string;
      badge: string;
      title: string;
      subtitle: MessageTemplate;
      hint: string;
      acknowledge: string;
      openAlmanac: string;
      roundEnded: string;
    };
  };
  errors: {
    streamReadFailed: string;
    streamFailed: string;
    missingFinalState: string;
    createCharacterFailed: string;
    requestFailed: string;
    invalidName: string;
  };
  stats: Record<
    | "happiness"
    | "health"
    | "wealth"
    | "career"
    | "study"
    | "social"
    | "love"
    | "marriage",
    { label: string }
  >;
  events: Record<
    | "fallbackBreath"
    | "brick"
    | "debut"
    | "gaokao"
    | "tagBonusAfterWork"
    | "easterNameLong",
    { title: string }
  >;
  narrative: {
    idleLine: string;
    yearLine: MessageTemplate;
    deathYear: MessageTemplate;
    skillFlavor: Record<
      | "happiness"
      | "health"
      | "wealth"
      | "career"
      | "study"
      | "social"
      | "love"
      | "marriage",
      string
    >;
  };
  llm: {
    roleJson: string;
    rolePlain: string;
    replyInEnglish: string;
    replyInChinese: string;
    noLanguageMixing: string;
  };
};

export type TranslationKey = "life.status.summary";
