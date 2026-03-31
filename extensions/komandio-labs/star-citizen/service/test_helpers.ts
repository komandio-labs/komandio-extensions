import { Komandio } from "@komandio/sdk";
import { join } from "node:path";

function fromFileUrl(url: string): string {
    const u = new URL(url);
    let path = u.pathname;
    if (Deno.build.os === "windows") {
        path = path.replace(/^\/([A-Za-z]:\/)/, "$1").replace(/\//g, "\\");
    }
    return path;
}

/** Absolute path to the star-citizen/data/ directory, matching getCachePath() in ShipService. */
export const DATA_DIR = fromFileUrl(new URL("../data/", import.meta.url).href);

export function getTestCachePath(fileName: string): string {
    return join(DATA_DIR, fileName);
}

export const MOCK_GAME_VERSION = "3.23.0";

/**
 * Full vehicle fixture covering all test scenarios:
 *   id 1 — Drake Cutlass Black    cargo, crew 1-3, scu 46
 *   id 2 — Aegis Gladius          military, solo (crew 1)
 *   id 3 — RSI Constellation Andromeda  cargo+exploration, crew 3-5, scu 96
 *   id 4 — Argo MOLE              mining, crew 2-4
 *   id 5 — RSI Zeus Mk II MR      cargo, concept, crew 1-2, scu 60
 *   id 6 — Drake Cutlass Red      medical, crew 1-3
 */
export const MOCK_VEHICLES = [
    {
        id: 1, name: "Cutlass Black", name_full: "Drake Cutlass Black",
        slug: "cutlass-black", scu: 46, crew: "1-3",
        length: 29, width: 26, height: 10, mass: 226700,
        company_name: "Drake Interplanetary", pad_type: "Medium",
        url_photo: "https://example.com/cutlass.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1,
        fuel_hydrogen: 3000, fuel_quantum: 500,
        is_cargo: 1, is_mining: 0, is_salvage: 0, is_medical: 0,
        is_exploration: 0, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
    {
        id: 2, name: "Gladius", name_full: "Aegis Gladius",
        slug: "gladius", scu: 0, crew: "1",
        length: 21, width: 16, height: 5, mass: 86400,
        company_name: "Aegis Dynamics", pad_type: "Small",
        url_photo: "https://example.com/gladius.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1,
        fuel_hydrogen: 1200, fuel_quantum: 200,
        is_cargo: 0, is_mining: 0, is_salvage: 0, is_medical: 0,
        is_exploration: 0, is_military: 1, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
    {
        id: 3, name: "Constellation Andromeda", name_full: "RSI Constellation Andromeda",
        slug: "constellation-andromeda", scu: 96, crew: "3-5",
        length: 61, width: 26, height: 14, mass: 891000,
        company_name: "Roberts Space Industries", pad_type: "Large",
        url_photo: "https://example.com/constellation.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1,
        fuel_hydrogen: 8000, fuel_quantum: 1500,
        is_cargo: 1, is_mining: 0, is_salvage: 0, is_medical: 0,
        is_exploration: 1, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
    {
        id: 4, name: "MOLE", name_full: "Argo MOLE",
        slug: "argo-mole", scu: 0, crew: "2-4",
        length: 41, width: 35, height: 12, mass: 450000,
        company_name: "Argo Astronautics", pad_type: "Large",
        url_photo: "https://example.com/mole.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1,
        fuel_hydrogen: 5000, fuel_quantum: 1000,
        is_cargo: 0, is_mining: 1, is_salvage: 0, is_medical: 0,
        is_exploration: 0, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
    {
        id: 5, name: "Zeus Mk II MR", name_full: "RSI Zeus Mk II MR",
        slug: "zeus-mk-ii-mr", scu: 60, crew: "1-2",
        length: 35, width: 28, height: 8, mass: 310000,
        company_name: "Roberts Space Industries", pad_type: "Medium",
        url_photo: "https://example.com/zeus.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 1, is_quantum_capable: 0,
        fuel_hydrogen: 0, fuel_quantum: 0,
        is_cargo: 1, is_mining: 0, is_salvage: 0, is_medical: 0,
        is_exploration: 0, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
    {
        id: 6, name: "Cutlass Red", name_full: "Drake Cutlass Red",
        slug: "cutlass-red", scu: 0, crew: "1-3",
        length: 29, width: 26, height: 10, mass: 226700,
        company_name: "Drake Interplanetary", pad_type: "Medium",
        url_photo: "https://example.com/cutlass-red.jpg",
        is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1,
        fuel_hydrogen: 3000, fuel_quantum: 500,
        is_cargo: 0, is_mining: 0, is_salvage: 0, is_medical: 1,
        is_exploration: 0, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    },
];

export const MOCK_PRICES = [
    { id_vehicle: 1, price: 110.00, price_warbond: 95.00, on_sale: 0, on_sale_warbond: 0 },
    { id_vehicle: 2, price: 90.00,  price_warbond: null,  on_sale: 1, on_sale_warbond: 0 },
    { id_vehicle: 3, price: 250.00, price_warbond: 225.00, on_sale: 0, on_sale_warbond: 1 },
];

export const MOCK_PURCHASES = [
    { id_vehicle: 1, terminal_name: "Area18",  price_buy: 1385300 },
    { id_vehicle: 1, terminal_name: "Lorville", price_buy: 1400000 },
    { id_vehicle: 2, terminal_name: "Area18",  price_buy: 850000 },
];

export const MOCK_RENTALS = [
    { id_vehicle: 1, terminal_name: "Everus Harbor", price_rent: 27706 },
    { id_vehicle: 2, terminal_name: "Area18",         price_rent: 17000 },
];

export type MockFetch = (url: string, options?: any) => Promise<any>;

export function buildMockFetch(
    liveVersion = MOCK_GAME_VERSION,
    overrides: {
        vehicles?: any[];
        prices?: any[];
        purchases?: any[];
        rentals?: any[];
        errorStatus?: number;
    } = {}
): MockFetch {
    return async (url: string, _opts?: any) => {
        if (overrides.errorStatus) {
            const statusText =
                overrides.errorStatus === 401 ? "Unauthorized" :
                overrides.errorStatus === 403 ? "Forbidden" :
                "Internal Server Error";
            return { status: overrides.errorStatus, statusText, json: async () => ({}) };
        }

        let data: any;
        if      (url.includes("/game_versions"))                      data = { live: liveVersion };
        else if (url.includes("/vehicles_prices"))                    data = overrides.prices    ?? MOCK_PRICES;
        else if (url.includes("/vehicles_purchases_prices_all"))      data = overrides.purchases ?? MOCK_PURCHASES;
        else if (url.includes("/vehicles_rentals_prices_all"))        data = overrides.rentals   ?? MOCK_RENTALS;
        else if (url.includes("/vehicles"))                           data = overrides.vehicles  ?? MOCK_VEHICLES;
        else                                                          data = {};

        return { status: 200, statusText: "OK", json: async () => ({ data }) };
    };
}

/** Wraps a fetch function to record every URL that was called. */
export function trackingFetch(inner: MockFetch): { fetch: MockFetch; calls: string[] } {
    const calls: string[] = [];
    return {
        calls,
        fetch: async (url: string, opts?: any) => {
            calls.push(url);
            return inner(url, opts);
        },
    };
}

/** Installs mock implementations for Komandio.log, .network, and .storage. */
export function installMock(options: {
    apiKey?: string | null;
    fetch?: MockFetch;
    liveVersion?: string;
} = {}) {
    const { apiKey = "fake-api-key", liveVersion = MOCK_GAME_VERSION } = options;

    (Komandio as any).log = (_msg: string) => {};
    (Komandio as any).network = { fetch: options.fetch ?? buildMockFetch(liveVersion) };
    (Komandio as any).storage = {
        getSecret:     async (_key: string) => apiKey,
        getSetting:    async (_key: string) => null,
        saveSetting:   async () => {},
        saveSecret:    async () => {},
        deleteSecret:  async () => {},
        deleteSetting: async () => {},
    };
}
