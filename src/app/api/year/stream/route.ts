import { SCHEMA_VERSION } from "@/lib/constants";
import {
  YearApiRequestSchema,
  YearApiResponseSchema,
} from "@/lib/schemas/game";
import { loadEvents } from "@/lib/engine/events";
import { advanceYear } from "@/lib/engine/advance-year";
import { applyMilestone } from "@/lib/milestones";
import { templateNarrative } from "@/lib/narrative/template";
import {
  streamLlmNarrativePlain,
  streamTemplateChunks,
} from "@/lib/narrative/llm-stream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = YearApiRequestSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid body",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (parsed.data.schemaVersion !== SCHEMA_VERSION) {
    return new Response(
      JSON.stringify({ error: `schemaVersion must be ${SCHEMA_VERSION}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const skillAlloc = parsed.data.state.lastSkillAllocation;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
        );
      };

      try {
        const events = loadEvents();
        const { nextState: advanced, pickedEvents, engineFallback } =
          advanceYear(parsed.data.state, events);

        const eventIds = pickedEvents.map((e) => e.id);
        const eventTitles = pickedEvents.map((e) => e.title);

        let fullText = "";
        let usedLlm = false;
        let fromTemplate = false;

        for await (const piece of streamLlmNarrativePlain({
          name: advanced.name,
          age: advanced.age,
          runSeed: advanced.runSeed,
          attrs: advanced.attrs,
          historyForSkills: parsed.data.state.history,
          eventIds,
          eventTitles,
          skillKey: skillAlloc,
        })) {
          usedLlm = true;
          fullText += piece;
          send({ type: "delta", text: piece });
        }

        if (!fullText.trim()) {
          fromTemplate = true;
          const templateText = templateNarrative(
            advanced.name,
            advanced.age,
            eventTitles,
            skillAlloc
          );
          for await (const piece of streamTemplateChunks(templateText)) {
            fullText += piece;
            send({ type: "delta", text: piece });
          }
        }

        const narrativeFallback = fromTemplate || !usedLlm;

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
              eventIds,
              narrative: fullText,
              fallback: narrativeFallback,
              skillAllocation: skillAlloc,
            },
          ],
        };

        const payload = {
          schemaVersion: SCHEMA_VERSION,
          state: withHistory,
          yearSummary: {
            age: advanced.age,
            eventIds,
            narrative: fullText,
            fallback: narrativeFallback,
            engineFallback,
            milestoneMessage,
          },
        };

        YearApiResponseSchema.parse(payload);
        send({ type: "final", payload });
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Server error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
