import { Komandio, Skill, Tool, Result, ToolResult } from "@komandio/sdk";

@Skill({
  name: "star_citizen",
  version: "1.2.0",
  description: "The ultimate AI assistant for Star Citizen. Features: Ship Database with real-time market prices, role-based ship discovery, warbond pricing, and flyable/concept status.",
  author: "komandio",
  repository: "",
  supportedGames: ["Star Citizen"],
  category: "Gaming",
  tags: [],
  examples: [
    "Find Drake ships",
    "How much is the Aegis Gladius?",
    "Show me info about the Carrack",
    "Search for mining ships",
    "What are the best cargo ships?",
    "Find solo-friendly medical ships"
  ]
})
export default class StarCitizenSkill {

  @Tool({
    name: "find_ships_by_criteria",
    description: "Search for Star Citizen ships by name, manufacturer, or role. Returns up to 5 results.",
    returns: "A compact list of matching ships.",
    params: [
      { name: "query", description: "Name or manufacturer to search for.", type: "string", optional: true },
      { name: "role", description: "Role filter e.g. 'mining', 'cargo', 'salvage', 'medical', 'exploration', 'military'.", type: "string", optional: true },
      { name: "max_crew", description: "Maximum crew size for filtering solo/small crew ships.", type: "number", optional: true }
    ]
  })
  async find_ships_by_criteria(query?: string, role?: string, max_crew?: number): Promise<ToolResult<string>> {
    try {
        if (!query && !role) {
            return Result.error("At least one of 'query' or 'role' must be provided.");
        }

        const ships: any = await Komandio.service.call({
            targetId: "komandio-labs.star-citizen",
            command: "FIND_SHIPS_BY_CRITERIA",
            payload: { query, role, max_crew }
        });

        if (ships && ships.error) {
            return Result.error(`Service error: ${ships.error}`, ships.category || "General");
        }

        if (!ships || ships.length === 0) {
            const parts: string[] = [];
            if (query) parts.push(`name/manufacturer '${query}'`);
            if (role) parts.push(`role '${role}'`);
            if (max_crew) parts.push(`max crew ${max_crew}`);
            return Result.ok(`No ships found matching ${parts.join(" and ")}.`);
        }

        const list = (ships as any[]).map(s => {
            const price = s.price_auec
                ? `${s.price_auec.toLocaleString()} aUEC`
                : s.price_pledge
                    ? `$${s.price_pledge}`
                    : "N/A";
            const roles = s.roles?.length > 0 ? s.roles.join(", ") : "General";
            const flags = [
                s.on_sale ? "[SALE]" : null,
                s.is_concept ? "[CONCEPT]" : !s.is_flyable ? "[NOT FLYABLE]" : null
            ].filter(Boolean).join(" ");
            return `${s.name_full} | ${roles} | Crew: ${s.crew} | SCU: ${s.scu} | ${price}${flags ? " " + flags : ""}`;
        }).join("\n");

        return Result.ok(`Found ${(ships as any[]).length} ship(s):\n${list}`);
    } catch (e: any) {
        return Result.error(`Error searching ships: ${e.message}`);
    }
  }

  @Tool({
    name: "get_ship_info",
    description: "Retrieves detailed specifications, pricing, and specific in-game purchase/rental locations for a ship.",
    returns: "Detailed ship stats including where to buy or rent it.",
    params: [
      { name: "ship_name", description: "The exact or partial name of the ship.", type: "string" }
    ]
  })
  async get_ship_info(ship_name: string): Promise<ToolResult<string>> {
    try {
        const ship: any = await Komandio.service.call({
            targetId: "komandio-labs.star-citizen",
            command: "GET_SHIP",
            payload: { name: ship_name }
        });

        if (ship && ship.error) {
            return Result.error(`Service error: ${ship.error}`, ship.category || "General");
        }

        if (!ship) {
            return Result.ok(`I couldn't find details for '${ship_name}'.`);
        }

        const fmt = (n: number) => n ? n.toLocaleString() : "N/A";

        const buyLocations = ship.purchasable_at?.length > 0
            ? [...new Set(ship.purchasable_at.map((p: any) => p.location))].join(", ")
            : "N/A";

        const rentLocations = ship.rentable_at?.length > 0
            ? [...new Set(ship.rentable_at.map((r: any) => r.location))].join(", ")
            : "N/A";

        const roles = (ship.roles?.length > 0) ? ship.roles.join(", ") : "General";

        const statusParts: string[] = [];
        if (ship.is_flyable) statusParts.push("Flyable");
        else if (ship.is_concept) statusParts.push("Concept only");
        if (ship.is_quantum_capable) statusParts.push("Quantum capable");
        const statusLine = statusParts.length > 0 ? statusParts.join(", ") : "Unknown";

        // Pledge price line: show warbond if available, add ON SALE badge
        let pledgeLine = "Not Sold";
        if (ship.price_pledge) {
            const saleTag = ship.on_sale ? " [ON SALE]" : "";
            pledgeLine = `$${ship.price_pledge}${saleTag}`;
            if (ship.price_warbond) {
                const wbSaleTag = ship.on_sale_warbond ? " [ON SALE]" : "";
                pledgeLine += ` (Warbond: $${ship.price_warbond}${wbSaleTag})`;
            }
        }

        const fuelLine = (ship.fuel_hydrogen || ship.fuel_quantum)
            ? `H: ${fmt(ship.fuel_hydrogen)}  QT: ${fmt(ship.fuel_quantum)}`
            : "N/A";

        const details = [
            `Name: ${ship.name_full}`,
            `Manufacturer: ${ship.manufacturer}`,
            `Roles: ${roles}`,
            `Status: ${statusLine}`,
            `Size: ${ship.size}`,
            `Crew: ${ship.crew}`,
            `Cargo: ${ship.scu} SCU`,
            `Length: ${ship.length}m`,
            `Mass: ${fmt(ship.mass)}kg`,
            `Fuel (SCU): ${fuelLine}`,
            ``,
            `--- Market Data ---`,
            `Pledge Cost: ${pledgeLine}`,
            `In-Game Price: ${ship.price_auec ? fmt(ship.price_auec) + " aUEC" : "Not Purchasable"}`,
            `Available At: ${buyLocations}`,
            ``,
            `Rental Price: ${ship.price_rent ? fmt(ship.price_rent) + " aUEC" : "Not Rentable"}`,
            `Rentable At: ${rentLocations}`
        ].join("\n");

        if (ship.url_photo) {
            // Future: Show image on HUD
        }

        return Result.ok(details);
    } catch (e: any) {
        return Result.error(`Error getting ship info: ${e.message}`);
    }
  }
}
