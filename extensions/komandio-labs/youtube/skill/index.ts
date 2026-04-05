import { Komandio, Skill, Tool, Result, ToolResult } from "@komandio/sdk";

@Skill({
  name: "youtube",
  version: "1.0.0",
  description: "Mainly aimed for video playback. Can search and play videos, pause, resume, stop, or close the player.",
  author: "komandio",
  repository: "https://github.com/komandio-labs/youtube",
  supportedGames: ["Any"],
  category: "media",
  tags: ["media", "video", "youtube", "watch", "visual"],
  examples: [
    "Search for Star Citizen gameplay on YouTube",
    "Pause the video",
    "Resume playback",
    "Skip to the next video",
    "Close the YouTube player"
  ]
})
export default class YouTubeSkill {

  @Tool({
    name: "run_command",
    description: "Search, show, find, or play videos on YouTube. Use this tool whenever the user asks to show, find, search for, watch, or play something on YouTube. Supports actions: play (also covers 'show', 'find', 'search for', 'look up', 'watch'), pause, resume, stop, next, previous, close.",
    returns: "Confirmation message about the action taken.",
    params: [
      { name: "action", description: "The action to perform. Use 'play' when the user says show, find, search, look up, watch, or play. Other values: 'pause', 'resume', 'stop', 'next', 'previous', 'close', 'current'.", type: "string" },
      { name: "query", description: "The search query. Optional. If omitted and action is 'play', opens YouTube homepage.", type: "string", optional: true },
      { name: "target", description: "Where to play: 'overlay', 'browser', or 'ask'. Leave empty to use user's default setting.", type: "string", optional: true }
    ]
  })
  async run_command(action: string, query?: string, target?: string): Promise<ToolResult<string>> {
    const overlayId = "komandio-labs.youtube/overlay/player";

    try {
        switch (action.toLowerCase()) {
          case "play":
            let finalTarget = target?.toLowerCase();
            if (!finalTarget) {
                finalTarget = await Komandio.storage.getSetting("youtubeTarget") || "overlay";
            }

            // Handle the "just open YouTube" case
            if (!query) {
                if (finalTarget === "browser") {
                     await Komandio.os.openUrl("https://www.youtube.com");
                     return Result.ok("Opening YouTube in browser.");
                } else {
                     return Result.error("You must provide a search query to play in the Overlay.");
                }
            }

            const videoIds = await this.searchYouTube(query);
            if (!videoIds || videoIds.length === 0) {
                return Result.error(`Error: Could not find any videos for '${query}' on YouTube.`);
            }

            if (finalTarget === "ask") {
                return Result.ok(`I found ${query}. Where should I play it? Overlay or Browser? [WAIT]`);   
            }

            if (finalTarget === "browser") {
                const url = `https://www.youtube.com/watch?v=${videoIds[0]}`;
                await Komandio.os.openUrl(url);
                return Result.ok();
            }

            // Save state for 'current' query using persistent storage (as workers are transient)
            await Komandio.storage.saveSetting("last_played_query", query);

            console.log(`[YouTube Skill] Loading ${videoIds.length} videos for query: ${query}`);
            await Komandio.ui.showOverlay(overlayId);
            await Komandio.ui.updateOverlay(overlayId, videoIds.map(id => ({ videoId: id })), "LoadAndPlay");

            return Result.ok(); // Silent Action

          case "pause":
            await Komandio.ui.updateOverlay(overlayId, {}, "Pause");
            return Result.ok();

          case "resume":
            await Komandio.ui.updateOverlay(overlayId, {}, "Play");
            return Result.ok();

          case "stop":
            await Komandio.ui.updateOverlay(overlayId, {}, "Stop");
            return Result.ok();

          case "next":
            await Komandio.ui.updateOverlay(overlayId, {}, "Next");
            return Result.ok();

          case "previous":
            await Komandio.ui.updateOverlay(overlayId, {}, "Prev");
            return Result.ok();

          case "close":
            await Komandio.storage.saveSetting("last_played_query", ""); // Clear state
            await Komandio.ui.closeOverlay(overlayId);
            return Result.ok();

          case "current":
            const lastQuery = await Komandio.storage.getSetting("last_played_query");
            if (lastQuery) {
                // Return data (Query), triggers AI recursion
                return Result.ok(`Currently playing content related to: "${lastQuery}"`);
            }
            return Result.ok("Nothing is currently playing on YouTube.");

          default:
            return Result.error(`Unknown action: ${action}`);
        }
    } catch (e: any) {
        console.error("[YouTube Skill] Error:", e);
        return Result.error(`YouTube error: ${e.message || e}`);
    }
  }
  private async searchYouTube(query: string): Promise<string[]> {
    console.log(`[YouTube Skill] Searching for: ${query}`);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
            }
        });
        
        const html = await response.text();
        const results: string[] = [];
        
        // Find ytInitialData
        let dataJson: string | null = null;
        const match1 = html.match(/var ytInitialData = ({.*?});/);
        if (match1) dataJson = match1[1];
        else {
            const match2 = html.match(/window\['ytInitialData'\] = ({.*?});/);
            if (match2) dataJson = match2[1];
        }

        if (dataJson) {
            try {
                const data = JSON.parse(dataJson);
                const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                
                if (contents) {
                    for (const section of contents) {
                        const itemSection = section.itemSectionRenderer;
                        if (!itemSection) continue;
                        
                        for (const item of itemSection.contents) {
                            if (item.videoRenderer && item.videoRenderer.videoId) {
                                results.push(item.videoRenderer.videoId);
                                if (results.length >= 10) break;
                            }
                        }
                        if (results.length >= 10) break;
                    }
                }
            } catch (e) {
                console.warn("[YouTube Skill] JSON parse failed.");
            }
        }
        
        // Fallback Regex
        if (results.length < 10) {
             const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
             let m;
             while ((m = regex.exec(html)) !== null) {
                 if (!results.includes(m[1])) results.push(m[1]);
                 if (results.length >= 10) break;
             }
        }
        
        return results;
    } catch (e) {
        console.error("[YouTube Skill] Search error:", e);
        throw e;
    }
  }
}