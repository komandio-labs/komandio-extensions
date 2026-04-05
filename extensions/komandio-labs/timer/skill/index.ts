import { Komandio, Skill, Tool, Result, ToolResult } from "@komandio/sdk";

@Skill({
  name: "timer",
  version: "1.0.0",
  description: "A visual timer extension.",
  author: "komandio",
  supportedGames: ["Any"],
  category: "utility",
  tags: ["timer", "utility"],
  examples: [
    "Set a timer for 10 minutes",
    "Timer for 5 minutes labeled Pizza",
    "Stop the timer",
    "How much time is left?"
  ]
})
export default class TimerSkill {

  @Tool({
    name: "start_timer",
    description: "Starts a countdown timer for a specified duration.",
    returns: "A confirmation message.",
    params: [
      { name: "duration", description: "Duration in seconds.", type: "number" },
      { name: "label", description: "Label for the timer. If the user does not explicitly provide a label, leave this blank.", type: "string", optional: true }
    ]
  })
  async start_timer(duration: number, label?: string): Promise<ToolResult<string>> {
    try {
        if (duration <= 0) {
            return Result.fail("Duration must be greater than zero.");
        }

        const finalLabel = label || "Timer";

        // 1. Trigger the background service (Persists after this skill worker dies)
        await Komandio.service.call({
            targetId: "komandio-labs.timer",
            command: "START_TIMER",
            payload: { duration, label: finalLabel }
        });

        // 2. Show UI immediately
        const overlayId = "komandio-labs.timer/overlay/timer";
        await Komandio.ui.showOverlay(overlayId, { width: 300, height: 150 });
        
        return Result.ok();
    } catch (e: any) {
        return Result.error(`Error starting timer: ${e.message || e}`);
    }
  }

  @Tool({
    name: "stop_timer",
    description: "Stops and cancels any currently running timer.",
    returns: "A confirmation message."
  })
  async stop_timer(): Promise<ToolResult<string>> {
    try {
        await Komandio.service.call({
            targetId: "komandio-labs.timer",
            command: "STOP_TIMER"
        });
        return Result.ok();
    } catch (e: any) {
        return Result.error(`Error stopping timer: ${e.message || e}`);
    }
  }

  @Tool({
    name: "get_timer_status",
    description: "Checks how much time is left on the active timer.",
    returns: "The status of the timer."
  })
  async get_timer_status(): Promise<ToolResult<string>> {
    try {
        const status: any = await Komandio.service.call({
            targetId: "komandio-labs.timer",
            command: "GET_STATUS"
        });

        if (!status || status.state === "idle" || status.state === "finished") {
            return Result.ok("There are no active timers running.");
        }

        // Re-open UI if it was closed
        const overlayId = "komandio-labs.timer/overlay/timer";
        await Komandio.ui.showOverlay(overlayId, { width: 300, height: 150 });

        return Result.ok(`The ${status.label} timer has ${status.remaining} seconds remaining.`);
    } catch (e: any) {
        return Result.error(`Error getting timer status: ${e.message || e}`);
    }
  }
}
