import { assertEquals, assert, assertStringIncludes } from "jsr:@std/assert";
import { Komandio } from "@komandio/sdk";
import StarCitizenSkill from "./index.ts";

// Silence Komandio.log (calls sendToHost which throws outside Worker)
(Komandio as any).log = (_msg: string) => {};

let mockServiceResponse: any = null;
(Komandio as any).service = {
    call: async (_params: any) => mockServiceResponse,
};

const skill = new StarCitizenSkill();

// ── find_ships_by_criteria ─────────────────────────────────────────────────────

Deno.test("find_ships_by_criteria: error when both query and role are missing", async () => {
    const result = await skill.find_ships_by_criteria();
    assertEquals(result.hasError, true);
    assertStringIncludes(result.value as string, "query");
});

Deno.test("find_ships_by_criteria: returns no-results message for empty array", async () => {
    mockServiceResponse = [];
    const result = await skill.find_ships_by_criteria("NoSuchShip");
    assertEquals(result.hasError, false);
    assertStringIncludes(result.value as string, "No ships found");
});

Deno.test("find_ships_by_criteria: formats compact ship list", async () => {
    mockServiceResponse = [
        {
            name_full: "Drake Cutlass Black",
            roles: ["Cargo"],
            crew: "1-3",
            scu: 46,
            price_auec: 1385300,
            price_pledge: 110,
            on_sale: false,
            is_concept: false,
            is_flyable: true,
        },
    ];
    const result = await skill.find_ships_by_criteria("Cutlass");
    assertEquals(result.hasError, false);
    assertStringIncludes(result.value as string, "Drake Cutlass Black");
    assertStringIncludes(result.value as string, "Cargo");
    assertStringIncludes(result.value as string, "Crew: 1-3");
    assertStringIncludes(result.value as string, "SCU: 46");
    assertStringIncludes(result.value as string, "1,385,300");
});

Deno.test("find_ships_by_criteria: shows [SALE] flag when on_sale is true", async () => {
    mockServiceResponse = [
        {
            name_full: "Aegis Gladius",
            roles: ["Military"],
            crew: "1",
            scu: 0,
            price_auec: 850000,
            price_pledge: 90,
            on_sale: true,
            is_concept: false,
            is_flyable: true,
        },
    ];
    const result = await skill.find_ships_by_criteria(undefined, "military");
    assertStringIncludes(result.value as string, "[SALE]");
});

Deno.test("find_ships_by_criteria: shows [CONCEPT] flag for concept ships", async () => {
    mockServiceResponse = [
        {
            name_full: "RSI Zeus Mk II MR",
            roles: ["Cargo"],
            crew: "1-2",
            scu: 60,
            price_auec: null,
            price_pledge: 185,
            on_sale: false,
            is_concept: true,
            is_flyable: true,
        },
    ];
    const result = await skill.find_ships_by_criteria(undefined, "cargo");
    assertStringIncludes(result.value as string, "[CONCEPT]");
});

Deno.test("find_ships_by_criteria: shows [NOT FLYABLE] when not flyable and not concept", async () => {
    mockServiceResponse = [
        {
            name_full: "Test Prop",
            roles: [],
            crew: "1",
            scu: 0,
            price_auec: null,
            price_pledge: null,
            on_sale: false,
            is_concept: false,
            is_flyable: false,
        },
    ];
    const result = await skill.find_ships_by_criteria("Test");
    assertStringIncludes(result.value as string, "[NOT FLYABLE]");
});

Deno.test("find_ships_by_criteria: falls back to pledge price when no aUEC price", async () => {
    mockServiceResponse = [
        {
            name_full: "RSI Zeus Mk II MR",
            roles: ["Cargo"],
            crew: "1-2",
            scu: 60,
            price_auec: null,
            price_pledge: 185,
            on_sale: false,
            is_concept: false,
            is_flyable: true,
        },
    ];
    const result = await skill.find_ships_by_criteria("Zeus");
    assertStringIncludes(result.value as string, "$185");
});

Deno.test("find_ships_by_criteria: shows N/A when no price exists", async () => {
    mockServiceResponse = [
        {
            name_full: "Unknown Ship",
            roles: [],
            crew: "2",
            scu: 0,
            price_auec: null,
            price_pledge: null,
            on_sale: false,
            is_concept: false,
            is_flyable: true,
        },
    ];
    const result = await skill.find_ships_by_criteria("Unknown");
    assertStringIncludes(result.value as string, "N/A");
});

Deno.test("find_ships_by_criteria: surfaces service error with category", async () => {
    mockServiceResponse = { error: "API Key missing", category: "ConfigurationRequired" };
    const result = await skill.find_ships_by_criteria("Cutlass");
    assertEquals(result.hasError, true);
    assertStringIncludes(result.value as string, "API Key missing");
});

Deno.test("find_ships_by_criteria: shows count in result header", async () => {
    mockServiceResponse = [
        { name_full: "Ship A", roles: [], crew: "1", scu: 0, price_auec: 100000, price_pledge: null, on_sale: false, is_concept: false, is_flyable: true },
        { name_full: "Ship B", roles: [], crew: "1", scu: 0, price_auec: 200000, price_pledge: null, on_sale: false, is_concept: false, is_flyable: true },
    ];
    const result = await skill.find_ships_by_criteria("Ship");
    assertStringIncludes(result.value as string, "2 ship");
});

// ── get_ship_info ──────────────────────────────────────────────────────────────

Deno.test("get_ship_info: returns not-found message when service returns null", async () => {
    mockServiceResponse = null;
    const result = await skill.get_ship_info("Unknown Ship");
    assertEquals(result.hasError, false);
    assertStringIncludes(result.value as string, "Unknown Ship");
});

Deno.test("get_ship_info: formats all key ship fields", async () => {
    mockServiceResponse = makeFullShip();
    const result = await skill.get_ship_info("Cutlass Black");
    assertEquals(result.hasError, false);
    assertStringIncludes(result.value as string, "Drake Cutlass Black");
    assertStringIncludes(result.value as string, "Drake Interplanetary");
    assertStringIncludes(result.value as string, "Cargo");
    assertStringIncludes(result.value as string, "Medium");
    assertStringIncludes(result.value as string, "1-3");
    assertStringIncludes(result.value as string, "46");
});

Deno.test("get_ship_info: shows warbond price when available", async () => {
    mockServiceResponse = makeFullShip({ price_pledge: 110, price_warbond: 95, on_sale: false, on_sale_warbond: false });
    const result = await skill.get_ship_info("Cutlass Black");
    assertStringIncludes(result.value as string, "$110");
    assertStringIncludes(result.value as string, "Warbond: $95");
});

Deno.test("get_ship_info: shows [ON SALE] badge in pledge line", async () => {
    mockServiceResponse = makeFullShip({ price_pledge: 90, on_sale: true });
    const result = await skill.get_ship_info("Gladius");
    assertStringIncludes(result.value as string, "[ON SALE]");
});

Deno.test("get_ship_info: shows warbond [ON SALE] badge", async () => {
    mockServiceResponse = makeFullShip({ price_pledge: 250, price_warbond: 225, on_sale_warbond: true });
    const result = await skill.get_ship_info("Constellation");
    assertStringIncludes(result.value as string, "Warbond:");
    assertStringIncludes(result.value as string, "[ON SALE]");
});

Deno.test("get_ship_info: shows Not Purchasable when no aUEC price", async () => {
    mockServiceResponse = makeFullShip({ price_auec: null, purchasable_at: [] });
    const result = await skill.get_ship_info("Zeus");
    assertStringIncludes(result.value as string, "Not Purchasable");
});

Deno.test("get_ship_info: shows Not Rentable when no rental price", async () => {
    mockServiceResponse = makeFullShip({ price_rent: null, rentable_at: [] });
    const result = await skill.get_ship_info("Zeus");
    assertStringIncludes(result.value as string, "Not Rentable");
});

Deno.test("get_ship_info: deduplicates buy locations", async () => {
    mockServiceResponse = makeFullShip({
        purchasable_at: [
            { location: "Area18", price: 1385300 },
            { location: "Area18", price: 1385300 },  // duplicate
            { location: "Lorville", price: 1400000 },
        ],
        price_auec: 1385300,
    });
    const result = await skill.get_ship_info("Cutlass Black");
    const value = result.value as string;
    // "Area18" should appear only once in Available At line
    const availableAtLine = value.split("\n").find(l => l.startsWith("Available At:")) ?? "";
    const area18Count = (availableAtLine.match(/Area18/g) ?? []).length;
    assertEquals(area18Count, 1, "Area18 should appear only once after deduplication");
});

Deno.test("get_ship_info: shows concept-only status", async () => {
    mockServiceResponse = makeFullShip({ is_flyable: false, is_concept: true, is_quantum_capable: false });
    const result = await skill.get_ship_info("Zeus");
    assertStringIncludes(result.value as string, "Concept only");
});

Deno.test("get_ship_info: shows flyable + quantum capable status", async () => {
    mockServiceResponse = makeFullShip({ is_flyable: true, is_concept: false, is_quantum_capable: true });
    const result = await skill.get_ship_info("Cutlass Black");
    assertStringIncludes(result.value as string, "Flyable");
    assertStringIncludes(result.value as string, "Quantum capable");
});

Deno.test("get_ship_info: surfaces service error", async () => {
    mockServiceResponse = { error: "Ship not in database", category: "General" };
    const result = await skill.get_ship_info("BadShip");
    assertEquals(result.hasError, true);
    assertStringIncludes(result.value as string, "Ship not in database");
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFullShip(overrides: Partial<{
    name_full: string;
    manufacturer: string;
    roles: string[];
    size: string;
    crew: string;
    scu: number;
    length: number;
    mass: number;
    fuel_hydrogen: number;
    fuel_quantum: number;
    is_flyable: boolean;
    is_concept: boolean;
    is_quantum_capable: boolean;
    price_pledge: number | null;
    price_warbond: number | null;
    on_sale: boolean;
    on_sale_warbond: boolean;
    price_auec: number | null;
    price_rent: number | null;
    purchasable_at: Array<{ location: string; price: number }>;
    rentable_at: Array<{ location: string; price: number }>;
    url_photo: string;
}> = {}) {
    return {
        name_full: "Drake Cutlass Black",
        manufacturer: "Drake Interplanetary",
        roles: ["Cargo"],
        size: "Medium",
        crew: "1-3",
        scu: 46,
        length: 29,
        mass: 226700,
        fuel_hydrogen: 3000,
        fuel_quantum: 500,
        is_flyable: true,
        is_concept: false,
        is_quantum_capable: true,
        price_pledge: 110,
        price_warbond: null,
        on_sale: false,
        on_sale_warbond: false,
        price_auec: 1385300,
        price_rent: 27706,
        purchasable_at: [{ location: "Area18", price: 1385300 }],
        rentable_at: [{ location: "Everus Harbor", price: 27706 }],
        url_photo: "",
        ...overrides,
    };
}
