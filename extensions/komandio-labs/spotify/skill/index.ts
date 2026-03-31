import {Komandio, Skill, Tool, ToolParam, Result, ToolResult} from "@komandio/sdk";

@Skill({
    name: "spotify",
    version: "1.0.0",
    description: "Mainly aimed for music playback. Can search and play tracks, albums or artists on Spotify, pause, resume, or stop.",
    author: "komandio",
    repository: "https://github.com/komandio-labs/spotify",
    supportedGames: ["Any"],
    category: "media",
    tags: ["media", "music", "spotify", "songs", "tracks", "albums"],
    examples: [
        "Play some rock music",
        "Skip to the next song",
        "Pause the music",
        "What's the current track?",
        "Play my favorite playlist",
        "Connect Spotify"
    ]
})
export default class SpotifySkill {

    @Tool({
        name: "run_command",
        description: "CRITICAL: You MUST call this tool to control Spotify. Use 'login' to authenticate/connect. Do NOT acknowledge the user's request without calling this tool first. If you do not call this tool, the music will NOT change. Use this for ALL playback actions: 'play', 'pause', 'resume', 'next', 'previous', 'stop'.",
        returns: "A confirmation message about the playback action."
    })
    async run_command(
        @ToolParam({
            name: "action",
            description: "The action to perform: 'play', 'pause', 'resume', 'next', 'previous', 'stop', 'login', 'current'.",
            type: "string"
        }) action: string,
        @ToolParam({
            name: "query",
            description: "The song title or artist name (required for 'play' action).",
            type: "string",
            optional: true
        }) query?: string,
        @ToolParam({
            name: "target",
            description: "Optional explicit playback target: 'overlay', 'browser', 'desktop', 'active', 'phone'.",
            type: "string",
            optional: true
        }) target?: string
    ): Promise<ToolResult<string>> {
        const overlayId = "komandio-labs.spotify/overlay/player";

        console.log(`[DEBUG] SpotifySkill: run_command triggered. Action: ${action}, Query: ${query}, Target: ${target}`);

        const normalizedAction = action.toLowerCase();

        try {
            switch (normalizedAction) {
                case "current":
                    console.log("[DEBUG] SpotifySkill: Querying currently playing track...");
                    const currentTrack = await Komandio.service.call({
                        targetId: "komandio-labs.spotify",
                        command: "GET_CURRENTLY_PLAYING"
                    });

                    if (currentTrack && currentTrack.item) {
                        const trackName = currentTrack.item.name;
                        const artistName = currentTrack.item.artists?.[0]?.name || "Unknown Artist";
                        const isPlaying = currentTrack.is_playing ? "Playing" : "Paused";
                        return Result.ok(`Currently ${isPlaying}: "${trackName}" by ${artistName}.`);
                    } else {
                        return Result.ok("No track is currently playing on your active Spotify device.");
                    }

                case "play":
                    if (!query) throw new Error("Please specify what you want to play.");

                    // 1. Resolve Target (Explicit vs Settings)
                    let finalTarget = target?.toLowerCase();
                    if (!finalTarget) {
                        // Default to 'active' (Spotify Connect) instead of 'overlay'
                        finalTarget = await Komandio.storage.getSetting("spotifyTarget") || "active";
                        console.log(`[DEBUG] SpotifySkill: No explicit target. Resolved from settings (defaulting to active): ${finalTarget}`);
                    } else {
                        console.log(`[DEBUG] SpotifySkill: Using explicit target: ${finalTarget}`);
                    }

                    // 2. Perform Search via Service
                    console.log(`[DEBUG] SpotifySkill: Searching for '${query}'...`);
                    const searchResult = await Komandio.service.call({
                        targetId: "komandio-labs.spotify",
                        command: "SEARCH",
                        payload: {query}
                    });

                    if (!searchResult) {
                        console.error("[DEBUG] SpotifySkill: Search returned null response.");
                        throw new Error("I'm having trouble searching Spotify right now.");
                    }

                    console.log(`[DEBUG] SpotifySkill: Search structure keys: ${Object.keys(searchResult).join(", ")}`);

                    let itemUri: string | null = null;
                    let itemUrl: string | null = null;
                    let itemName: string = query;

                    if (searchResult.tracks?.items?.length > 0) {
                        const track = searchResult.tracks.items[0];
                        itemUri = track.uri;
                        itemUrl = track.external_urls?.spotify;
                        itemName = `${track.name} by ${track.artists[0].name}`;
                        console.log(`[DEBUG] SpotifySkill: Found track: ${itemName} (${itemUri})`);
                    } else if (searchResult.artists?.items?.length > 0) {
                        const artist = searchResult.artists.items[0];
                        itemUri = artist.uri;
                        itemUrl = artist.external_urls?.spotify;
                        itemName = artist.name;
                        console.log(`[DEBUG] SpotifySkill: Found artist: ${itemName} (${itemUri})`);
                    }

                    if (!itemUri) {
                        if (searchResult.error) {
                            console.error("[DEBUG] SpotifySkill: Search result contained an error:", JSON.stringify(searchResult.error));

                            if (searchResult.error.status === 401 || searchResult.error === "invalid_grant" || searchResult.error === "unauthorized") {
                                throw new Error("Error: Your Spotify session has expired. Please say 'Connect Spotify' to log in again.");
                            }

                            throw new Error(`Spotify returned an error: ${searchResult.error.message || JSON.stringify(searchResult.error)}`);
                        }
                        console.warn(`[DEBUG] SpotifySkill: Item '${query}' not found in search results. Full result: ${JSON.stringify(searchResult)}`);
                        throw new Error(`I couldn't find '${query}' on Spotify.`);
                    }

                    // 3. Routing Logic
                    const playPayload = {
                        uris: itemUri.includes(":track:") ? [itemUri] : undefined,
                        contextUri: !itemUri.includes(":track:") ? itemUri : undefined
                    };

                    // Helper: find a specific device from the device list
                    const findDevice = (devices: any[], type: string): any | null => {
                        if (type === "browser") {
                            return devices.find((d: any) => d.type.toLowerCase() === "computer" && d.name.toLowerCase().includes("web player"));
                        } else if (type === "desktop") {
                            return devices.find((d: any) => d.type.toLowerCase() === "computer" && !d.name.toLowerCase().includes("web player"));
                        } else if (type === "phone") {
                            return devices.find((d: any) => d.type.toLowerCase() === "smartphone");
                        }
                        return null;
                    };

                    // Helper: send PLAY to a specific device
                    const playOnDevice = async (deviceId: string) => {
                        await Komandio.service.call({
                            targetId: "komandio-labs.spotify",
                            command: "PLAY",
                            payload: { deviceId, ...playPayload }
                        });
                    };

                    // Helper: open the app/browser, wait for the device to appear, then play
                    const launchAndPlay = async (type: "browser" | "desktop"): Promise<ToolResult<string>> => {
                        // Launch the app or browser first
                        if (type === "browser") {
                            const url = itemUrl || `https://open.spotify.com`;
                            console.log(`[DEBUG] SpotifySkill: Opening browser with URL: ${url}`);
                            await Komandio.os.openUrl(url);
                        } else {
                            console.log(`[DEBUG] SpotifySkill: Opening desktop app with URI: ${itemUri}`);
                            await Komandio.os.openUrl(itemUri!);
                        }

                        // Poll for the device to appear (up to ~5 seconds)
                        for (let attempt = 0; attempt < 5; attempt++) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            console.log(`[DEBUG] SpotifySkill: Polling for ${type} device (attempt ${attempt + 1}/5)...`);
                            const freshDevices: any[] = await Komandio.service.call({
                                targetId: "komandio-labs.spotify",
                                command: "GET_DEVICES"
                            }) || [];
                            const device = findDevice(freshDevices, type);
                            if (device) {
                                console.log(`[DEBUG] SpotifySkill: Found ${type} device after launch: ${device.name}`);
                                await playOnDevice(device.id);
                                return Result.ok();
                            }
                        }

                        // If we still can't find the device, report it
                        console.warn(`[DEBUG] SpotifySkill: Could not find ${type} device after launching.`);
                        if (type === "browser" && itemUrl) {
                            return Result.ok(`I opened Spotify in your browser. The track should start playing there.`);
                        }
                        return Result.ok(`I opened the Spotify ${type} app but couldn't confirm playback started. You may need to press play manually.`);
                    };

                    // Fetch devices if we might need them
                    let devices: any[] = [];
                    if (finalTarget !== "overlay" && finalTarget !== "ask") {
                        devices = await Komandio.service.call({
                            targetId: "komandio-labs.spotify",
                            command: "GET_DEVICES"
                        }) || [];
                        console.log(`[DEBUG] SpotifySkill: Found ${devices.length} device(s): ${devices.map((d: any) => `${d.name} (${d.type}, active=${d.is_active})`).join(", ")}`);
                    }

                    // --- Target: active (Spotify Connect — whatever is currently playing) ---
                    if (finalTarget === "active") {
                        const activeDevice = devices.find((d: any) => d.is_active);
                        if (activeDevice) {
                            console.log(`[DEBUG] SpotifySkill: Found active device: ${activeDevice.name}. Routing play command.`);
                            await playOnDevice(activeDevice.id);
                            return Result.ok();
                        }

                        // No device is marked active, but devices exist — pick the first one
                        // Starting playback on it will make it active
                        if (devices.length > 0) {
                            const fallbackDevice = devices[0];
                            console.log(`[DEBUG] SpotifySkill: No active device, but found ${devices.length} available device(s). Playing on: ${fallbackDevice.name} (${fallbackDevice.id})`);
                            await playOnDevice(fallbackDevice.id);
                            return Result.ok();
                        }

                        console.log("[DEBUG] SpotifySkill: No devices found at all. Falling back to overlay.");
                        finalTarget = "overlay";
                    }

                    // --- Target: overlay ---
                    if (finalTarget === "overlay") {
                        console.log(`[DEBUG] SpotifySkill: Routing to overlay.`);
                        await Komandio.ui.showOverlay(overlayId);
                        Komandio.ui.updateOverlay(overlayId, {uris: [itemUri]}, "LoadAndPlay").catch(console.error);
                        return Result.ok();
                    }

                    // --- Target: browser, desktop, phone ---
                    if (finalTarget === "browser" || finalTarget === "desktop" || finalTarget === "phone") {
                        const targetDevice = findDevice(devices, finalTarget);

                        if (targetDevice) {
                            console.log(`[DEBUG] SpotifySkill: Sending PLAY to device: ${targetDevice.name} (${targetDevice.id})`);
                            await playOnDevice(targetDevice.id);
                            return Result.ok();
                        }

                        console.log(`[DEBUG] SpotifySkill: No ${finalTarget} device found. Attempting to launch and retry.`);

                        // Browser/Desktop: launch the app, then poll for the device and play
                        if (finalTarget === "browser" || finalTarget === "desktop") {
                            return await launchAndPlay(finalTarget);
                        }

                        // Phone: can't launch remotely
                        return Result.error(`I couldn't find your phone in Spotify's device list. Make sure the Spotify app is open on your phone and try again.`);
                    }

                    // --- Target: ask ---
                    if (finalTarget === "ask") {
                        console.log(`[DEBUG] SpotifySkill: Mode is 'ask'. Returning prompt.`);
                        return Result.ok(`I found ${itemName}. Where should I play it? Overlay, Browser, or Desktop? [WAIT]`);
                    }

                    // --- Unknown target: fall back to overlay ---
                    console.warn(`[DEBUG] SpotifySkill: Unknown target '${finalTarget}'. Falling back to overlay.`);
                    await Komandio.ui.showOverlay(overlayId);
                    Komandio.ui.updateOverlay(overlayId, {uris: [itemUri]}, "LoadAndPlay").catch(console.error);
                    return Result.ok();
          
                case "pause":
                case "resume":
                case "next":
                case "previous":
                case "stop":
                    console.log(`[DEBUG] SpotifySkill: Handling ${normalizedAction} with smart routing.`);

                    // First, check if Overlay is open - if so, command it too
                    Komandio.ui.updateOverlay(overlayId, {}, normalizedAction === "resume" ? "Play" : normalizedAction.charAt(0).toUpperCase() + normalizedAction.slice(1)).catch(() => {
                    });

                    // Second, send command to active device
                    const controlCmd = normalizedAction === "stop" ? "pause" : normalizedAction;
                    await Komandio.service.call({
                        targetId: "komandio-labs.spotify",
                        command: "CONTROL",
                        payload: {command: controlCmd}
                    });

                    return Result.ok();

                case "login":
                    await Komandio.service.call({targetId: "komandio-labs.spotify", command: "LOGIN"});
                    return Result.ok();

                default:
                    return Result.error(`Unknown action: ${action}`);
            }
        } catch (e: any) {
            console.error(`[Spotify Skill] Error:`, e);
            return Result.error(`Spotify Error: ${e.message || String(e)}`);
        }
    }
}
