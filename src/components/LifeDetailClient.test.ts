"use client";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/client-locale";
import { LifeDetailClient } from "./LifeDetailClient";

describe("LifeDetailClient", () => {
  it("shows english character creation copy by default", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(LifeDetailClient)
      )
    );

    expect(html).toContain("Create Character");
  });
});
