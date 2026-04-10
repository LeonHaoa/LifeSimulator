"use client";

import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LocaleProvider, useLocale } from "./client-locale";

function Probe() {
  const { locale } = useLocale();
  return React.createElement("div", null, locale);
}

describe("LocaleProvider", () => {
  it("defaults to english", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(Probe)
      )
    );

    expect(html).toContain("en");
  });
});
