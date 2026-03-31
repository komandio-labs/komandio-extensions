import { Komandio } from "@komandio/sdk";
import { join } from "node:path";
import { fieldsFuzzyScore } from "@komandio/sdk/fuzzy";

export interface Ship {
    id: number;
    name: string;
    name_full: string;
    slug: string;
    scu: number;
    crew: string;
    length: number;
    width: number;
    height: number;
    mass: number;
    manufacturer: string;
    size: string; // pad_type
    url_photo: string;

    // Flight/concept status
    is_flyable: boolean;
    is_concept: boolean;
    is_quantum_capable: boolean;

    // Fuel capacities
    fuel_hydrogen: number;
    fuel_quantum: number;

    // Roles derived from is_* flags on the vehicle record
    roles: string[];

    // Enriched Pricing Data
    price_pledge: number | null;      // USD
    price_warbond: number | null;     // USD warbond price
    on_sale: boolean;                 // currently on sale in the pledge store
    on_sale_warbond: boolean;         // warbond variant currently on sale
    price_auec: number | null;        // Lowest aUEC price
    price_rent: number | null;        // Lowest rental price

    purchasable_at: Array<{ location: string, price: number }>;
    rentable_at: Array<{ location: string, price: number }>;
}

/** Maps API boolean flag names to human-readable role strings. */
const ROLE_FLAGS: Record<string, string> = {
    is_cargo:        "Cargo",
    is_mining:       "Mining",
    is_salvage:      "Salvage",
    is_medical:      "Medical",
    is_exploration:  "Exploration",
    is_military:     "Military",
    is_racing:       "Racing",
    is_refuel:       "Refuel",
    is_repair:       "Repair",
    is_stealth:      "Stealth",
    is_carrier:      "Carrier",
    is_boarding:     "Boarding",
    is_passenger:    "Passenger",
    is_datarunner:   "Data Runner",
    is_scanning:     "Scanning",
    is_interdiction: "Interdiction",
};

const DATA_FILE = "ships.json";
const API_BASE = "https://api.uexcorp.uk/2.0";

/**
 * Manual helper to convert file:// URLs to local paths without external dependencies.
 */
function fromFileUrl(url: string): string {
  const u = new URL(url);
  let path = u.pathname;
  if (Deno.build.os === "windows") {
    path = path.replace(/^\/([A-Za-z]:\/)/, "$1").replace(/\//g, "\\");
  }
  return path;
}

export class ShipService {
    private ships: Ship[] = [];
    private lastUpdate: number = 0;
    private currentVersion: string = "0.0.0";
    private dataFile: string;
    private isInitialized: boolean = false;

    constructor(dataFileName: string = "ships.json") {
        this.dataFile = dataFileName;
    }

    private async getCachePath(): Promise<string> {
        const currentDir = fromFileUrl(new URL(".", import.meta.url).href);
        const extensionRoot = join(currentDir, "..");
        const dataDir = join(extensionRoot, "data");
        
        try {
            await Deno.mkdir(dataDir, { recursive: true });
        } catch {}
        
        return join(dataDir, this.dataFile);
    }

    private async loadCache() {
        try {
            const path = await this.getCachePath();
            const text = await Deno.readTextFile(path);
            const data = JSON.parse(text);
            this.ships = data.ships || [];
            this.lastUpdate = data.timestamp || 0;
            this.currentVersion = data.version || "0.0.0";
            
            // Validation: Check if enriched data exists in at least one ship
            const hasLocations = this.ships.some(s => s.purchasable_at && s.purchasable_at.length > 0);
            if (!hasLocations && this.ships.length > 0) {
                Komandio.log("Cached data is missing location info. Forcing refresh.");
                this.currentVersion = "0.0.0";
            }

            // Validation: Check if role data is present (added in a later version)
            const hasRoles = this.ships.length === 0 || this.ships[0].roles !== undefined;
            if (!hasRoles) {
                Komandio.log("Cached data is missing role flags. Forcing refresh.");
                this.currentVersion = "0.0.0";
            }

            Komandio.log(`Ship Database loaded from cache. Version: ${this.currentVersion}. Count: ${this.ships.length}`);
        } catch (e) {
            Komandio.log("No valid ship cache found.");
            this.currentVersion = "0.0.0";
        }
    }

    private async saveCache(version: string) {
        try {
            const path = await this.getCachePath();
            const data = {
                version: version,
                timestamp: Date.now(),
                ships: this.ships
            };
            await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
            Komandio.log(`Ship database saved to disk. Version: ${version}`);
        } catch (e) {
            console.error(`[SC Database] Error saving database: ${e}`);
        }
    }

    public async ensureData() {
        if (!this.isInitialized) {
            await this.loadCache();
            this.isInitialized = true;
        }

        try {
            // Check Live Version
            const status = await this.fetchEndpoint("game_versions");
            const liveVersion = status?.live || "unknown";

            if (this.ships.length === 0 || liveVersion !== this.currentVersion) {
                Komandio.log(`Update required. Local: ${this.currentVersion} | Live: ${liveVersion}`);
                await this.fetchFromApi(liveVersion);
            }
        } catch (e: any) {
            const errorMsg = e?.message || (typeof e === 'string' ? e : "Unknown API error");
            Komandio.log(`Could not check live version (${errorMsg}). Proceeding with cached data.`);
            if (this.ships.length === 0) {
                // Re-throw the original object so the MessageHandler can catch the category
                throw e;
            }
        }
    }

    private async fetchEndpoint(endpoint: string): Promise<any> {
        const apiKey = await Komandio.storage.getSecret("uex_api_key");
        if (!apiKey) {
            Komandio.log("UEXCorp API Key is missing. Please configure it in extension settings.");
            throw { message: "Missing UEX API Key", category: "ConfigurationRequired" };
        }

        const url = `${API_BASE}/${endpoint}`;
        const response = await Komandio.network.fetch(url, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });

        if (response.status < 200 || response.status >= 300) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Invalid UEX API Key. Please check your settings.");
            }
            throw new Error(`API Error ${url}: ${response.statusText}`);
        }
        const json = await response.json();
        return json.data;
    }

    private async fetchFromApi(newVersion: string) {
        try {
            Komandio.log("Synchronizing full ship and market database from UEXCorp...");
            
            // 1. Fetch all datasets in parallel
            const [vehicles, prices, purchases, rentals] = await Promise.all([
                this.fetchEndpoint("vehicles"),
                this.fetchEndpoint("vehicles_prices"),
                this.fetchEndpoint("vehicles_purchases_prices_all"),
                this.fetchEndpoint("vehicles_rentals_prices_all")
            ]);

            // 2. Index Ships by ID
            const shipMap = new Map<number, Ship>();

            // Initialize Ships
            for (const v of vehicles) {
                // Derive role list from is_* boolean flags on the vehicle record
                const roles: string[] = [];
                for (const [flag, label] of Object.entries(ROLE_FLAGS)) {
                    if (v[flag] === 1 || v[flag] === true) {
                        roles.push(label);
                    }
                }

                shipMap.set(v.id, {
                    id: v.id,
                    name: v.name,
                    name_full: v.name_full,
                    slug: v.slug,
                    scu: v.scu ?? 0,
                    crew: v.crew,
                    length: v.length,
                    width: v.width,
                    height: v.height,
                    mass: v.mass,
                    manufacturer: v.company_name,
                    size: v.pad_type,
                    url_photo: v.url_photo,
                    is_flyable: v.is_spaceship === 1 || v.is_ground_vehicle === 1,
                    is_concept: v.is_concept === 1 || v.is_concept === true,
                    is_quantum_capable: v.is_quantum_capable === 1 || v.is_quantum_capable === true,
                    fuel_hydrogen: v.fuel_hydrogen ?? 0,
                    fuel_quantum: v.fuel_quantum ?? 0,
                    roles,

                    price_pledge: null,
                    price_warbond: null,
                    on_sale: false,
                    on_sale_warbond: false,
                    price_auec: null,
                    price_rent: null,
                    purchasable_at: [],
                    rentable_at: []
                });
            }

            // 3. Merge Pledge Prices (USD) — includes warbond and sale flags
            for (const p of prices) {
                const ship = shipMap.get(p.id_vehicle);
                if (!ship) continue;
                if (p.price) {
                    ship.price_pledge = p.price;
                }
                if (p.price_warbond) {
                    ship.price_warbond = p.price_warbond;
                }
                if (p.on_sale === 1 || p.on_sale === true) {
                    ship.on_sale = true;
                }
                if (p.on_sale_warbond === 1 || p.on_sale_warbond === true) {
                    ship.on_sale_warbond = true;
                }
            }

            // 4. Merge Purchase Prices (aUEC)
            for (const p of purchases) {
                const ship = shipMap.get(p.id_vehicle);
                if (ship) {
                    ship.purchasable_at.push({
                        location: p.terminal_name,
                        price: p.price_buy
                    });
                    // Track lowest price
                    if (ship.price_auec === null || (p.price_buy > 0 && p.price_buy < ship.price_auec)) {
                        ship.price_auec = p.price_buy;
                    }
                }
            }

            // 5. Merge Rental Prices (aUEC)
            for (const r of rentals) {
                const ship = shipMap.get(r.id_vehicle);
                if (ship) {
                    ship.rentable_at.push({
                        location: r.terminal_name,
                        price: r.price_rent
                    });
                    // Track lowest rental
                    if (ship.price_rent === null || (r.price_rent > 0 && r.price_rent < ship.price_rent)) {
                        ship.price_rent = r.price_rent;
                    }
                }
            }

            this.ships = Array.from(shipMap.values());
            this.currentVersion = newVersion;
            await this.saveCache(newVersion);
            Komandio.log(`Ship Database updated to version ${newVersion}.`);

        } catch (e) {
            console.error(`[SC Database] Update failed: ${e}`);
            if (this.ships.length === 0) throw e;
        }
    }

    public async getShipByName(name: string): Promise<Ship | null> {
        await this.ensureData();
        const q = name.toLowerCase();

        // 1. Exact full-name match
        let match = this.ships.find(s =>
            s.name.toLowerCase() === q || s.name_full.toLowerCase() === q
        );
        if (match) return match;

        // 2. Substring match
        match = this.ships.find(s =>
            s.name.toLowerCase().includes(q) || s.name_full.toLowerCase().includes(q)
        );
        if (match) return match;

        // 3. Fuzzy fallback — return the single best-scoring ship above threshold
        const FUZZY_MIN_SCORE = 0.3;
        let bestScore = 0;
        let bestShip: Ship | null = null;

        for (const s of this.ships) {
            const score = fieldsFuzzyScore(name, s.name, s.name_full, s.manufacturer);
            if (score > bestScore) {
                bestScore = score;
                bestShip = s;
            }
        }

        return bestScore >= FUZZY_MIN_SCORE ? bestShip : null;
    }

    /**
     * Combined search: filter by name/manufacturer query and/or role, with optional
     * max crew cap. At least one of query or role must be provided. Caps at 5 results.
     */
    public async findShipsByCriteria(query?: string, role?: string, maxCrew?: number): Promise<Ship[]> {
        await this.ensureData();

        let results: Ship[] = this.ships;

        // Apply name/manufacturer filter
        if (query) {
            const q = query.toLowerCase();
            const exact = results.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.name_full.toLowerCase().includes(q) ||
                s.manufacturer.toLowerCase().includes(q)
            );
            if (exact.length > 0) {
                results = exact;
            } else {
                // Fuzzy fallback
                const FUZZY_MIN_SCORE = 0.3;
                const scored = results
                    .map(s => ({
                        ship: s,
                        score: fieldsFuzzyScore(query, s.name, s.name_full, s.manufacturer)
                    }))
                    .filter(({ score }) => score >= FUZZY_MIN_SCORE)
                    .sort((a, b) => b.score - a.score);
                results = scored.map(({ ship }) => ship);
            }
        }

        // Apply role filter
        if (role) {
            const normalised = role.trim().toLowerCase();
            results = results.filter(s =>
                s.roles.some(r => r.toLowerCase().includes(normalised))
            );

            // Sort: cargo by SCU descending, others alphabetically
            const isCargoQuery = normalised.includes("cargo");
            if (isCargoQuery) {
                results.sort((a, b) => (b.scu ?? 0) - (a.scu ?? 0));
            } else {
                results.sort((a, b) => a.name_full.localeCompare(b.name_full));
            }
        }

        // Apply crew filter
        if (maxCrew !== undefined && maxCrew > 0) {
            results = results.filter(s => {
                const minCrew = parseInt(s.crew?.toString().split("-")[0] ?? "1", 10);
                return !isNaN(minCrew) && minCrew <= maxCrew;
            });
        }

        return results.slice(0, 5);
    }
}
