import en from "../../../messages/en";
import zhCN from "../../../messages/zh-CN";
import { defaultLocale, isSupportedLocale } from "./config";
import type { InterpolationValues, Locale, Messages, TranslationKey } from "./types";

const dictionaries: Record<Locale, Messages> = {
  en,
  "zh-CN": zhCN,
};

export function getDictionary(locale: string): Messages {
  return dictionaries[isSupportedLocale(locale) ? locale : defaultLocale];
}

export function t(
  locale: string,
  key: TranslationKey,
  params: InterpolationValues
): string {
  const dictionary = getDictionary(locale);

  switch (key) {
    case "life.status.summary":
      return dictionary.life.status.summary(params);
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}
