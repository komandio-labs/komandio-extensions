import { Komandio, Service, Route, MessageHandler, OnInit } from "@komandio/sdk";

@Service({
    name: "Spotify Backend",
    description: "Manages Spotify Authentication and State",
    supportedGames: ["Any"],
    category: "media"
})
export default class SpotifyService {
    private clientId = "01ce450e988e424f97e2168ec9bf29d9";
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private resumeQueue: { command: string, payload: any }[] = [];

    @OnInit
    async init() {
        console.log("Spotify Service Initializing...");
        // Try to load existing refresh token from host storage
        this.refreshToken = await Komandio.storage.getSecret("spotify_refresh_token");
        if (this.refreshToken) {
            console.log("Found saved refresh token. Pre-fetching access token...");
            await this.refreshAccessToken();
        }
    }

    @Route("GET", "/auth/callback")
    async handleCallback(req: any) {
        const url = new URL(req.path, "http://127.0.0.1"); // req.path is relative
        const code = url.searchParams.get("code");
        
        if (code) {
            console.log("Received auth code, exchanging for tokens...");
            await this.exchangeCode(code);
            
            if (this.accessToken) {
                // Notify Overlay
                await Komandio.ui.updateOverlay("player", {}, "AUTH_SUCCESS");

                // Resume queued actions
                if (this.resumeQueue.length > 0) {
                    console.log(`[DENO DEBUG] Resuming ${this.resumeQueue.length} queued actions...`);
                    for (const item of this.resumeQueue) {
                        this.handleInternalMessage(item.command, item.payload).catch(console.error);
                    }
                    this.resumeQueue = [];
                }

                return { statusCode: 200, body: "Authentication successful! You can close this window." };
            } else {
                return { statusCode: 500, body: "Authentication failed. Token exchange error." };
            }
        }
        
        return { statusCode: 400, body: "Invalid callback request." };
    }

    @MessageHandler("GET_TOKEN")
    async handleGetToken() {
        if (!this.accessToken) {
            await this.refreshAccessToken();
        }
        return { token: this.accessToken };
    }

    @MessageHandler("SEARCH")
    async handleSearch(payload: { query: string, type?: string }) {
        if (!this.accessToken) {
            await this.refreshAccessToken();
            if (!this.accessToken) return { error: "unauthorized" };
        }
        const type = payload.type || "track,artist,album";
        
        const params = new URLSearchParams({ 
            q: payload.query, 
            type: type, 
            limit: "5" 
        });

        const resp = await Komandio.network.fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
            headers: { "Authorization": `Bearer ${this.accessToken}` }
        });

        return await resp.json();
    }

    @MessageHandler("GET_DEVICES")
    async handleGetDevices() {
        if (!this.accessToken) {
            await this.refreshAccessToken();
            if (!this.accessToken) return [];
        }
        
        const resp = await Komandio.network.fetch("https://api.spotify.com/v1/me/player/devices", {
            headers: { "Authorization": `Bearer ${this.accessToken}` }
        });
        
        const data = await resp.json();
        return data.devices || [];
    }

    @MessageHandler("PLAY")
    async handlePlay(payload: { deviceId?: string, uris?: string[], contextUri?: string }) {
        if (!this.accessToken) {
            await this.refreshAccessToken();
            if (!this.accessToken) {
                console.log("[DENO DEBUG] Token revoked during PLAY. Queuing for resume.");
                this.resumeQueue.push({ command: "PLAY", payload });
                return { success: false, error: "unauthorized" };
            }
        }
        
        const url = payload.deviceId 
            ? `https://api.spotify.com/v1/me/player/play?device_id=${payload.deviceId}`
            : "https://api.spotify.com/v1/me/player/play";

        const body: any = {};
        if (payload.uris) body.uris = payload.uris;
        if (payload.contextUri) body.context_uri = payload.contextUri;

        console.log(`[DENO DEBUG] Spotify Service: Executing PLAY. Target Device: ${payload.deviceId || "Active"}`);

        const resp = await Komandio.network.fetch(url, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.accessToken}` 
            },
            body: JSON.stringify(body)
        });

        if (resp.status > 204) {
            const errorData = await resp.json().catch(() => ({}));
            console.error(`[DENO DEBUG] Spotify Play Failed (${resp.status}):`, JSON.stringify(errorData));
            return { success: false, status: resp.status, error: errorData };
        }

        return { success: true };
    }

    @MessageHandler("GET_CURRENTLY_PLAYING")
    async handleGetCurrentlyPlaying() {
        if (!this.accessToken) {
            await this.refreshAccessToken();
            if (!this.accessToken) return null;
        }

        const resp = await Komandio.network.fetch("https://api.spotify.com/v1/me/player/currently-playing", {
            headers: { "Authorization": `Bearer ${this.accessToken}` }
        });

        if (resp.status === 204) return null; // No content (nothing playing)
        
        return await resp.json();
    }

    @MessageHandler("CONTROL")
    async handleControl(payload: { command: 'next' | 'previous' | 'pause' | 'resume', deviceId?: string }) {
        if (!this.accessToken) await this.refreshAccessToken();
        
        let url = "";
        let method = "POST";

        switch(payload.command) {
            case 'next': url = "/next"; break;
            case 'previous': url = "/previous"; break;
            case 'pause': url = "/pause"; method = "PUT"; break;
            case 'resume': url = "/play"; method = "PUT"; break;
        }

        console.log(`[DENO DEBUG] Spotify Service: Executing ${payload.command.toUpperCase()} on ${payload.deviceId || "active device"}`);

        const baseUrl = "https://api.spotify.com/v1/me/player";
        const fullUrl = payload.deviceId ? `${baseUrl}${url}?device_id=${payload.deviceId}` : `${baseUrl}${url}`;

        const resp = await Komandio.network.fetch(fullUrl, {
            method,
            headers: { "Authorization": `Bearer ${this.accessToken}` }
        });

        return { success: resp.status === 204 || resp.status === 200 };
    }

    private async handleInternalMessage(command: string, payload: any) {
        if (command === "PLAY") return this.handlePlay(payload);
        if (command === "SEARCH") return this.handleSearch(payload);
        if (command === "CONTROL") return this.handleControl(payload);
        if (command === "GET_CURRENTLY_PLAYING") return this.handleGetCurrentlyPlaying();
        return null;
    }

    @MessageHandler("LOGIN")
    async handleLogin() {
        console.log("[DENO DEBUG] Spotify handleLogin triggered");
        const scopes = "streaming user-read-email user-read-private user-modify-playback-state user-read-currently-playing user-read-playback-state";
        const redirectUri = "http://127.0.0.1:15500/extensions/komandio-labs.spotify/service/auth/callback";
        
        const codeVerifier = this.generateCodeVerifier(128);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        await Komandio.storage.saveSecret("pkce_verifier", codeVerifier);

        const url = `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
        
        console.log("Opening Spotify Login URL...");
        await Komandio.os.openUrl(url);
        return { success: true };
    }

    private async exchangeCode(code: string) {
        const codeVerifier = await Komandio.storage.getSecret("pkce_verifier");
        
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: "http://127.0.0.1:15500/extensions/komandio-labs.spotify/service/auth/callback",
            client_id: this.clientId,
            code_verifier: codeVerifier || "" 
        });

        const resp = await Komandio.network.fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString()
        });

        const data = await resp.json();
        if (data.access_token) {
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            // Persist refresh token via host
            await Komandio.storage.saveSecret("spotify_refresh_token", this.refreshToken);
        } else {
            console.error("Token Exchange Failed:", JSON.stringify(data));
        }
    }

    private generateCodeVerifier(length: number) {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private async generateCodeChallenge(codeVerifier: string) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest("SHA-256", data);
        
        // Base64Url Encode
        // btoa works on strings
        const bytes = new Uint8Array(digest);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    private async refreshAccessToken() {
        if (!this.refreshToken) {
            console.error("[DENO DEBUG] Cannot refresh token: No refresh_token found in memory.");
            return;
        }

        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.refreshToken,
            client_id: this.clientId
        });

        console.log("[DENO DEBUG] Attempting Spotify token refresh...");
        const resp = await Komandio.network.fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString()
        });

        const data = await resp.json();
        if (data.access_token) {
            this.accessToken = data.access_token;
            console.log("[DENO DEBUG] Spotify Access Token Refreshed.");
            
            // IMPORTANT: If Spotify rotates the refresh token, save the new one!
            if (data.refresh_token && data.refresh_token !== this.refreshToken) {
                console.log("[DENO DEBUG] Received new refresh token. Updating persistence...");
                this.refreshToken = data.refresh_token;
                await Komandio.storage.saveSecret("spotify_refresh_token", this.refreshToken);
            }
        } else {
            console.error("[DENO DEBUG] Spotify Refresh Failed:", JSON.stringify(data));
            // Do not clear immediately on temporary network errors, but invalid_grant is fatal
            if (data.error === "invalid_grant") {
                this.accessToken = null;
                this.refreshToken = null;
                await Komandio.storage.deleteSecret("spotify_refresh_token");
            }
        }
    }
}
