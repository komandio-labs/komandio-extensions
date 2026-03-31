// sc.service/index.ts
import { Komandio, Service, Route, MessageHandler } from "@komandio/sdk";
import { ShipService } from "./ships.ts";

@Service({
    name: "star-citizen-service",
    version: "1.0.0"
})
export default class StarCitizenService {
    private ships: ShipService;

    constructor() {
        this.ships = new ShipService();
        // Pre-fetch data in the background so it's ready for the first query
        this.ships.ensureData().catch(err => {
            console.error(`[StarCitizenService] Failed to pre-fetch ship data: ${err}`);
        });
    }

    @Route("GET", "/prices")
    async getPrices() {
        try {
            const resp = await Komandio.network.fetch("https://raw.githubusercontent.com/itmichel/star-citizen-item-database/main/data/prices.json");
            return await resp.json();
        } catch (e) {
            return { error: "Failed to fetch prices" };
        }
    }

    @MessageHandler("FIND_SHIPS_BY_CRITERIA")
    async findShipsByCriteria(payload: { query?: string; role?: string; max_crew?: number }) {
        try {
            return await this.ships.findShipsByCriteria(payload.query, payload.role, payload.max_crew);
        } catch (e: any) {
            return {
                error: e?.message || String(e),
                category: e?.category || "General"
            };
        }
    }

    @MessageHandler("GET_SHIP")
    async getShip(payload: { name: string }) {
        try {
            return await this.ships.getShipByName(payload.name);
        } catch (e: any) {
            return {
                error: e?.message || String(e),
                category: e?.category || "General"
            };
        }
    }
}
