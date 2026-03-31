import { assertEquals, assert } from "jsr:@std/assert";
import { ShipService } from "./ships.ts";
import {
    installMock,
    buildMockFetch,
    trackingFetch,
    getTestCachePath,
    MOCK_VEHICLES,
    MOCK_PRICES,
    MOCK_PURCHASES,
    MOCK_RENTALS,
    MOCK_GAME_VERSION,
} from "./test_helpers.ts";

// ── Suite A: Data Enrichment ───────────────────────────────────────────────────

Deno.test("Enrichment: merges pledge price from vehicles_prices", async () => {
    installMock();
    const svc = new ShipService("test_enrich_pledge.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Cutlass Black");
        assertEquals(ship?.price_pledge, 110.00);
        assertEquals(ship?.price_warbond, 95.00);
        assertEquals(ship?.on_sale, false);
        assertEquals(ship?.on_sale_warbond, false);
    } finally {
        await cleanup("test_enrich_pledge.json");
    }
});

Deno.test("Enrichment: on_sale flag is set from vehicles_prices", async () => {
    installMock();
    const svc = new ShipService("test_enrich_sale.json");
    try {
        await svc.ensureData();
        const gladius = await svc.getShipByName("Gladius");
        assertEquals(gladius?.on_sale, true);
        assertEquals(gladius?.on_sale_warbond, false);
    } finally {
        await cleanup("test_enrich_sale.json");
    }
});

Deno.test("Enrichment: picks lowest aUEC price when multiple purchase locations exist", async () => {
    installMock();
    const svc = new ShipService("test_enrich_auec.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Cutlass Black");
        // Area18 = 1,385,300 < Lorville = 1,400,000 → lowest wins
        assertEquals(ship?.price_auec, 1385300);
        assertEquals(ship?.purchasable_at.length, 2);
    } finally {
        await cleanup("test_enrich_auec.json");
    }
});

Deno.test("Enrichment: picks lowest rental price", async () => {
    installMock();
    const svc = new ShipService("test_enrich_rent.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Cutlass Black");
        assertEquals(ship?.price_rent, 27706);
        assertEquals(ship?.rentable_at.length, 1);
    } finally {
        await cleanup("test_enrich_rent.json");
    }
});

Deno.test("Enrichment: derives roles from is_* flags", async () => {
    installMock();
    const svc = new ShipService("test_enrich_roles.json");
    try {
        await svc.ensureData();

        const cutlass = await svc.getShipByName("Cutlass Black");
        assert(cutlass?.roles.includes("Cargo"), "Expected Cargo role on Cutlass Black");

        const gladius = await svc.getShipByName("Gladius");
        assert(gladius?.roles.includes("Military"), "Expected Military role on Gladius");

        const mole = await svc.getShipByName("MOLE");
        assert(mole?.roles.includes("Mining"), "Expected Mining role on MOLE");

        const connie = await svc.getShipByName("Constellation Andromeda");
        assert(connie?.roles.includes("Cargo"), "Expected Cargo role on Constellation Andromeda");
        assert(connie?.roles.includes("Exploration"), "Expected Exploration role on Constellation Andromeda");
    } finally {
        await cleanup("test_enrich_roles.json");
    }
});

Deno.test("Enrichment: persists to cache and reloads enriched data", async () => {
    installMock();
    const FILE = "test_enrich_persist.json";
    const svc1 = new ShipService(FILE);
    try {
        await svc1.ensureData();

        // Second instance: network throws to prove it reads from disk
        installMock({ fetch: async () => { throw new Error("Network should not be called"); } });
        // Override game_versions only to allow version check
        const tracker = trackingFetch(buildMockFetch(MOCK_GAME_VERSION));
        installMock({ fetch: tracker.fetch });

        const svc2 = new ShipService(FILE);
        await svc2.ensureData();

        const ship = await svc2.getShipByName("Cutlass Black");
        assertEquals(ship?.price_pledge, 110.00, "Cache should preserve pledge price");
        assertEquals(ship?.purchasable_at.length, 2, "Cache should preserve purchase locations");

        // Full vehicle fetch should NOT have been called (cache hit)
        const vehicleCalls = tracker.calls.filter(u =>
            u.includes("/vehicles") &&
            !u.includes("/vehicles_prices") &&
            !u.includes("/vehicles_purchases") &&
            !u.includes("/vehicles_rentals")
        );
        assertEquals(vehicleCalls.length, 0, "Should not have re-fetched vehicles on cache hit");
    } finally {
        await cleanup(FILE);
    }
});

// ── Suite B: Cache Validation ──────────────────────────────────────────────────

Deno.test("Cache validation: forces re-fetch when purchasable_at is empty", async () => {
    const FILE = "test_cache_no_locations.json";

    // Write a stale cache: same version, but purchasable_at is empty on all ships
    const staleShips = MOCK_VEHICLES.map(v => ({
        id: v.id, name: v.name, name_full: v.name_full, slug: v.slug,
        scu: v.scu, crew: v.crew, length: v.length, width: v.width,
        height: v.height, mass: v.mass, manufacturer: v.company_name,
        size: v.pad_type, url_photo: v.url_photo,
        is_flyable: true, is_concept: false, is_quantum_capable: true,
        fuel_hydrogen: 0, fuel_quantum: 0, roles: ["Cargo"],
        price_pledge: null, price_warbond: null, on_sale: false,
        on_sale_warbond: false, price_auec: null, price_rent: null,
        purchasable_at: [], rentable_at: [],
    }));
    await Deno.writeTextFile(
        getTestCachePath(FILE),
        JSON.stringify({ version: MOCK_GAME_VERSION, timestamp: Date.now(), ships: staleShips })
    );

    const tracker = trackingFetch(buildMockFetch());
    installMock({ fetch: tracker.fetch });

    const svc = new ShipService(FILE);
    try {
        await svc.ensureData();
        const vehicleCalls = tracker.calls.filter(u =>
            u.includes("/vehicles") &&
            !u.includes("/vehicles_prices") &&
            !u.includes("/vehicles_purchases") &&
            !u.includes("/vehicles_rentals")
        );
        assert(vehicleCalls.length > 0, "Should have re-fetched vehicles when purchasable_at was empty");
    } finally {
        await cleanup(FILE);
    }
});

Deno.test("Cache validation: forces re-fetch when roles field is missing", async () => {
    const FILE = "test_cache_no_roles.json";

    // Write a stale cache: ships without the roles field
    const staleShips = MOCK_VEHICLES.map(v => ({
        id: v.id, name: v.name, name_full: v.name_full, slug: v.slug,
        scu: v.scu, crew: v.crew, length: v.length, width: v.width,
        height: v.height, mass: v.mass, manufacturer: v.company_name,
        size: v.pad_type, url_photo: v.url_photo,
        is_flyable: true, is_concept: false, is_quantum_capable: true,
        fuel_hydrogen: 0, fuel_quantum: 0,
        // intentionally omit 'roles'
        price_pledge: 100, price_warbond: null, on_sale: false,
        on_sale_warbond: false, price_auec: 1000000, price_rent: null,
        purchasable_at: [{ location: "Area18", price: 1000000 }],
        rentable_at: [],
    }));
    await Deno.writeTextFile(
        getTestCachePath(FILE),
        JSON.stringify({ version: MOCK_GAME_VERSION, timestamp: Date.now(), ships: staleShips })
    );

    const tracker = trackingFetch(buildMockFetch());
    installMock({ fetch: tracker.fetch });

    const svc = new ShipService(FILE);
    try {
        await svc.ensureData();
        const vehicleCalls = tracker.calls.filter(u =>
            u.includes("/vehicles") &&
            !u.includes("/vehicles_prices") &&
            !u.includes("/vehicles_purchases") &&
            !u.includes("/vehicles_rentals")
        );
        assert(vehicleCalls.length > 0, "Should have re-fetched vehicles when roles were missing");
    } finally {
        await cleanup(FILE);
    }
});

Deno.test("Cache validation: skips full fetch when live version matches valid cache", async () => {
    const FILE = "test_cache_hit.json";
    installMock();

    // Prime a valid cache
    const svc1 = new ShipService(FILE);
    try {
        await svc1.ensureData();

        // Now use a counting fetch that matches the same version
        const tracker = trackingFetch(buildMockFetch(MOCK_GAME_VERSION));
        installMock({ fetch: tracker.fetch });

        const svc2 = new ShipService(FILE);
        await svc2.ensureData();

        const vehicleCalls = tracker.calls.filter(u =>
            u.includes("/vehicles") &&
            !u.includes("/vehicles_prices") &&
            !u.includes("/vehicles_purchases") &&
            !u.includes("/vehicles_rentals")
        );
        assertEquals(vehicleCalls.length, 0, "Should not re-fetch when cache is valid");
    } finally {
        await cleanup(FILE);
    }
});

// ── Suite C: getShipByName ─────────────────────────────────────────────────────

Deno.test("getShipByName: exact name match", async () => {
    installMock();
    const svc = new ShipService("test_lookup_exact.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Cutlass Black");
        assert(ship !== null);
        assertEquals(ship?.name, "Cutlass Black");
    } finally {
        await cleanup("test_lookup_exact.json");
    }
});

Deno.test("getShipByName: exact full name match", async () => {
    installMock();
    const svc = new ShipService("test_lookup_fullname.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Drake Cutlass Black");
        assert(ship !== null);
        assertEquals(ship?.name_full, "Drake Cutlass Black");
    } finally {
        await cleanup("test_lookup_fullname.json");
    }
});

Deno.test("getShipByName: match is case-insensitive", async () => {
    installMock();
    const svc = new ShipService("test_lookup_case.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("drake cutlass black");
        assert(ship !== null, "Case-insensitive match should find the ship");
    } finally {
        await cleanup("test_lookup_case.json");
    }
});

Deno.test("getShipByName: substring match finds partial name", async () => {
    installMock();
    const svc = new ShipService("test_lookup_substring.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("Cutlass");
        assert(ship !== null, "Substring match should find ship");
        assert(ship!.name.toLowerCase().includes("cutlass"));
    } finally {
        await cleanup("test_lookup_substring.json");
    }
});

Deno.test("getShipByName: fuzzy match handles single-character typo", async () => {
    installMock();
    const svc = new ShipService("test_lookup_fuzzy.json");
    try {
        await svc.ensureData();
        // "Cutlas" — missing one 's'
        const ship = await svc.getShipByName("Cutlas");
        assert(ship !== null, "Fuzzy match should find ship with one missing char");
        assert(ship!.name.toLowerCase().includes("cutlass"));
    } finally {
        await cleanup("test_lookup_fuzzy.json");
    }
});

Deno.test("getShipByName: fuzzy match handles manufacturer typo", async () => {
    installMock();
    const svc = new ShipService("test_lookup_mfr_fuzzy.json");
    try {
        await svc.ensureData();
        // "Aegiss" — one extra char
        const ship = await svc.getShipByName("Aegiss Gladius");
        assert(ship !== null, "Fuzzy match should find ship despite manufacturer typo");
        assertEquals(ship?.manufacturer, "Aegis Dynamics");
    } finally {
        await cleanup("test_lookup_mfr_fuzzy.json");
    }
});

Deno.test("getShipByName: returns null when no plausible match exists", async () => {
    installMock();
    const svc = new ShipService("test_lookup_nomatch.json");
    try {
        await svc.ensureData();
        const ship = await svc.getShipByName("XXXXXXXXXXX");
        assertEquals(ship, null);
    } finally {
        await cleanup("test_lookup_nomatch.json");
    }
});

// ── Suite D: findShipsByCriteria ───────────────────────────────────────────────

Deno.test("findShipsByCriteria: query filter returns ships matching name", async () => {
    installMock();
    const svc = new ShipService("test_criteria_query.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria("Drake");
        assert(results.length > 0, "Should find Drake ships");
        assert(results.every(s => s.manufacturer === "Drake Interplanetary"),
            "All results should be Drake ships");
    } finally {
        await cleanup("test_criteria_query.json");
    }
});

Deno.test("findShipsByCriteria: role filter returns only matching ships", async () => {
    installMock();
    const svc = new ShipService("test_criteria_role.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria(undefined, "mining");
        assert(results.length > 0, "Should find mining ships");
        assert(results.every(s => s.roles.includes("Mining")),
            "All results should have Mining role");
    } finally {
        await cleanup("test_criteria_role.json");
    }
});

Deno.test("findShipsByCriteria: cargo role sorts by SCU descending", async () => {
    installMock();
    const svc = new ShipService("test_criteria_cargo_sort.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria(undefined, "cargo");
        assert(results.length >= 2, "Should find multiple cargo ships");
        for (let i = 0; i < results.length - 1; i++) {
            assert(
                (results[i].scu ?? 0) >= (results[i + 1].scu ?? 0),
                `Expected descending SCU order, but ${results[i].name_full} (${results[i].scu}) < ${results[i+1].name_full} (${results[i+1].scu})`
            );
        }
    } finally {
        await cleanup("test_criteria_cargo_sort.json");
    }
});

Deno.test("findShipsByCriteria: non-cargo role sorts alphabetically", async () => {
    installMock();
    const svc = new ShipService("test_criteria_alpha_sort.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria(undefined, "military");
        // With only Gladius in our fleet, just check it returns something
        assert(results.length > 0, "Should find military ships");
        // If more than one result, verify alphabetical order
        for (let i = 0; i < results.length - 1; i++) {
            assert(
                results[i].name_full.localeCompare(results[i + 1].name_full) <= 0,
                `Expected alphabetical order`
            );
        }
    } finally {
        await cleanup("test_criteria_alpha_sort.json");
    }
});

Deno.test("findShipsByCriteria: maxCrew filter excludes ships above cap", async () => {
    installMock();
    const svc = new ShipService("test_criteria_crew.json");
    try {
        await svc.ensureData();
        // Constellation Andromeda has min crew 3 — should be excluded with cap of 2
        const results = await svc.findShipsByCriteria(undefined, undefined, 2);
        assert(
            results.every(s => {
                const minCrew = parseInt(s.crew?.toString().split("-")[0] ?? "1", 10);
                return minCrew <= 2;
            }),
            "All results should have min crew ≤ 2"
        );
        const connie = results.find(s => s.name_full === "RSI Constellation Andromeda");
        assertEquals(connie, undefined, "Constellation Andromeda (min crew 3) should be excluded");
    } finally {
        await cleanup("test_criteria_crew.json");
    }
});

Deno.test("findShipsByCriteria: combined query + role returns intersection", async () => {
    installMock();
    const svc = new ShipService("test_criteria_combined.json");
    try {
        await svc.ensureData();
        // Drake ships that are also cargo
        const results = await svc.findShipsByCriteria("Drake", "cargo");
        assert(results.length > 0, "Should find Drake cargo ships");
        assert(results.every(s => s.manufacturer === "Drake Interplanetary"),
            "All results should be Drake");
        assert(results.every(s => s.roles.includes("Cargo")),
            "All results should have Cargo role");
    } finally {
        await cleanup("test_criteria_combined.json");
    }
});

Deno.test("findShipsByCriteria: fuzzy query filter falls back when no exact match", async () => {
    installMock();
    const svc = new ShipService("test_criteria_fuzzy.json");
    try {
        await svc.ensureData();
        // "Draak" — one-char typo for "Drake"
        const results = await svc.findShipsByCriteria("Draak");
        assert(results.length > 0, "Fuzzy query should find Drake ships");
    } finally {
        await cleanup("test_criteria_fuzzy.json");
    }
});

Deno.test("findShipsByCriteria: caps results at 5", async () => {
    // Override vehicles with 8 cargo ships to exceed the cap
    const manyCargoVehicles = Array.from({ length: 8 }, (_, i) => ({
        id: 100 + i,
        name: `Hauler ${i}`, name_full: `Test Hauler ${i}`,
        slug: `hauler-${i}`, scu: 100 + i * 10, crew: "1",
        length: 30, width: 20, height: 10, mass: 200000,
        company_name: "Test Corp", pad_type: "Large",
        url_photo: "", is_spaceship: 1, is_ground_vehicle: 0,
        is_concept: 0, is_quantum_capable: 1, fuel_hydrogen: 1000, fuel_quantum: 200,
        is_cargo: 1, is_mining: 0, is_salvage: 0, is_medical: 0,
        is_exploration: 0, is_military: 0, is_racing: 0, is_refuel: 0,
        is_repair: 0, is_stealth: 0, is_carrier: 0, is_boarding: 0,
        is_passenger: 0, is_datarunner: 0, is_scanning: 0, is_interdiction: 0,
    }));
    installMock({ fetch: buildMockFetch(MOCK_GAME_VERSION, { vehicles: manyCargoVehicles, prices: [], purchases: [], rentals: [] }) });

    const svc = new ShipService("test_criteria_cap.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria(undefined, "cargo");
        assertEquals(results.length, 5, "Results should be capped at 5");
    } finally {
        await cleanup("test_criteria_cap.json");
    }
});

Deno.test("findShipsByCriteria: returns empty array when nothing matches", async () => {
    installMock();
    const svc = new ShipService("test_criteria_empty.json");
    try {
        await svc.ensureData();
        const results = await svc.findShipsByCriteria("XXXXXXXXXXX", "nonexistentrole");
        assertEquals(results.length, 0);
    } finally {
        await cleanup("test_criteria_empty.json");
    }
});

// ── Suite E: Error Paths ───────────────────────────────────────────────────────

Deno.test("Error: throws ConfigurationRequired when API key is missing", async () => {
    installMock({ apiKey: null });
    const svc = new ShipService("test_err_nokey.json");
    let caught: any = null;
    try {
        await svc.ensureData();
    } catch (e) {
        caught = e;
    } finally {
        await cleanup("test_err_nokey.json");
    }
    assert(caught !== null, "Should have thrown");
    assertEquals(caught?.category, "ConfigurationRequired");
});

Deno.test("Error: throws on HTTP 401 Unauthorized", async () => {
    installMock({ fetch: buildMockFetch(MOCK_GAME_VERSION, { errorStatus: 401 }) });
    const svc = new ShipService("test_err_401.json");
    try {
        let caught: any = null;
        try { await svc.ensureData(); } catch (e) { caught = e; }
        assert(caught !== null, "Should have thrown");
        assert(caught.message?.includes("Invalid") || caught.message?.includes("API Key"),
            `Expected auth error message, got: ${caught.message}`);
    } finally {
        await cleanup("test_err_401.json");
    }
});

Deno.test("Error: throws on HTTP 500 server error", async () => {
    installMock({ fetch: buildMockFetch(MOCK_GAME_VERSION, { errorStatus: 500 }) });
    const svc = new ShipService("test_err_500.json");
    try {
        let caught: any = null;
        try { await svc.ensureData(); } catch (e) { caught = e; }
        assert(caught !== null, "Should have thrown");
        assert(caught.message?.includes("API Error"),
            `Expected API error message, got: ${caught.message}`);
    } finally {
        await cleanup("test_err_500.json");
    }
});

Deno.test("Error: falls back to cached data when network fails", async () => {
    const FILE = "test_err_netfail_cached.json";
    installMock();

    // Prime the cache
    const svc1 = new ShipService(FILE);
    try {
        await svc1.ensureData();

        // Now break the network
        installMock({ fetch: async () => { throw new Error("Network offline"); } });
        const svc2 = new ShipService(FILE);

        // Should not throw — falls back to cache
        await svc2.ensureData();
        const ship = await svc2.getShipByName("Cutlass Black");
        assert(ship !== null, "Should serve ship from cache despite network failure");
    } finally {
        await cleanup(FILE);
    }
});

Deno.test("Error: re-throws when network fails and no cache exists", async () => {
    installMock({ fetch: async () => { throw new Error("Network offline"); } });
    const svc = new ShipService("test_err_netfail_nocache.json");
    try {
        let caught: any = null;
        try { await svc.ensureData(); } catch (e) { caught = e; }
        assert(caught !== null, "Should re-throw when no cache is available");
    } finally {
        await cleanup("test_err_netfail_nocache.json");
    }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function cleanup(fileName: string) {
    try { await Deno.remove(getTestCachePath(fileName)); } catch { /* ignore */ }
}
