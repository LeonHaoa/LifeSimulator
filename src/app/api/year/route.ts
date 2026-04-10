import { NextResponse } from "next/server";
import { SCHEMA_VERSION } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionary";
import {
  YearApiRequestSchema,
  YearApiResponseSchema,
} from "@/lib/schemas/game";
import { loadEvents } from "@/lib/engine/events";
import { advanceYear } from "@/lib/engine/advance-year";
import { buildNarrative } from "@/lib/narrative/build-narrative";
import { applyMilestone } from "@/lib/milestones";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = YearApiRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.schemaVersion !== SCHEMA_VERSION) {
    return NextResponse.json(
      { error: `schemaVersion must be ${SCHEMA_VERSION}` },
      { status: 400 }
    );
  }

  try {
    const locale = parsed.data.locale;
    const copy = getDictionary(locale);
    const skillAlloc = parsed.data.state.lastSkillAllocation;
    const events = loadEvents();
    const { nextState: advanced, pickedEvents, engineFallback } = advanceYear(
      parsed.data.state,
      events
    );

    const narrative = await buildNarrative({
      locale,
      name: advanced.name,
      age: advanced.age,
      runSeed: advanced.runSeed,
      attrs: advanced.attrs,
      historyForSkills: parsed.data.state.history,
      eventIds: pickedEvents.map((e) => e.id),
      eventTitles: pickedEvents.map((e) => copy.events[e.titleKey].title),
      skillKey: skillAlloc,
    });

    const { milestonesShown, message: milestoneMessage } = applyMilestone(
      advanced.age,
      advanced.milestonesShown
    );

    const withHistory = {
      ...advanced,
      milestonesShown,
      history: [
        ...advanced.history,
        {
          age: advanced.age,
          eventIds: pickedEvents.map((e) => e.id),
          narrative: narrative.text,
          fallback: narrative.fallback,
          skillAllocation: skillAlloc,
        },
      ],
    };

    const body = {
      schemaVersion: SCHEMA_VERSION,
      state: withHistory,
      yearSummary: {
        age: advanced.age,
        eventIds: pickedEvents.map((e) => e.id),
        narrative: narrative.text,
        fallback: narrative.fallback,
        engineFallback,
        milestoneMessage,
      },
    };

    YearApiResponseSchema.parse(body);
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
