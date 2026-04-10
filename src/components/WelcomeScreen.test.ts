import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/client-locale";
import { WelcomeScreen } from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("renders the locale switcher in a dedicated top-right container", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(WelcomeScreen)
      )
    );

    expect(html).toContain("welcome-topbar");
    expect(html).not.toContain('<div class="welcome-cta"><div class="locale-switcher"');
  });
});
