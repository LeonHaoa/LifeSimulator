import { describe, expect, it } from "vitest";
import { defaultLocale, isSupportedLocale } from "./config";
import { getDictionary, t } from "./dictionary";

describe("dictionary", () => {
  it("falls back to english for unsupported locales", () => {
    expect(defaultLocale).toBe("en");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
    expect(getDictionary("fr").common.languageName).toBe("English");
  });

  it("keeps en and zh-CN dictionaries aligned", () => {
    const en = getDictionary("en");
    const zh = getDictionary("zh-CN");

    expect(Object.keys(en)).toEqual(Object.keys(zh));
    expect(Object.keys(en.life)).toEqual(Object.keys(zh.life));
    expect(Object.keys(en.stats)).toEqual(Object.keys(zh.stats));
    expect(Object.keys(en.events)).toEqual(Object.keys(zh.events));
  });

  it("interpolates translated copy", () => {
    expect(
      t("en", "life.status.summary", {
        name: "Alex",
        age: 3,
        max: 10_000,
      })
    ).toContain("Alex");
  });
});
