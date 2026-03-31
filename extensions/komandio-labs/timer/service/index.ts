import { Komandio, Service, MessageHandler } from "@komandio/sdk";

@Service({
    name: "timer_service",
    description: "Handles background timer countdowns."
})
export default class TimerService {
    private intervalId: any = null;
    private state: any = {
        state: "idle",
        duration: 0,
        remaining: 0,
        label: ""
    };

    @MessageHandler("START_TIMER")
    async onStartTimer(payload: { duration: number, label: string }) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.state = {
            state: "running",
            duration: payload.duration,
            remaining: payload.duration,
            label: payload.label || "Timer"
        };

        const overlayId = "komandio-labs.timer/overlay/timer";
        console.log(`[Timer Service] Starting timer: ${this.state.label} for ${this.state.duration}s`);

        await Komandio.ui.showOverlay(overlayId, { width: 300, height: 150 });
        await Komandio.ui.updateOverlay(overlayId, this.state);

        this.startLoop(overlayId);
        return { status: "OK" };
    }

    @MessageHandler("GET_STATUS")
    async onGetStatus() {
        return this.state;
    }

    @MessageHandler("STOP_TIMER")
    async onStopTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.state.state = "idle";
        await Komandio.ui.closeOverlay("komandio-labs.timer/overlay/timer");
        return { status: "OK" };
    }

    @MessageHandler("REPORT_READY")
    async onReportReady() {
        if (this.state.state !== "idle") {
            await Komandio.ui.updateOverlay("komandio-labs.timer/overlay/timer", this.state);
        }
    }

    private startLoop(overlayId: string) {
        this.intervalId = setInterval(async () => {
            this.state.remaining--;

            if (this.state.remaining <= 0) {
                if (this.intervalId) clearInterval(this.intervalId);
                this.intervalId = null;
                this.state.state = "finished";
                this.state.remaining = 0;
                
                await Komandio.ui.updateOverlay(overlayId, this.state);
                await Komandio.speech.speak(`${this.state.label} finished.`);

                setTimeout(() => {
                    if (this.state.state === "finished") {
                        Komandio.ui.closeOverlay(overlayId);
                        this.state.state = "idle";
                    }
                }, 5000);
            } else {
                await Komandio.ui.updateOverlay(overlayId, this.state);
            }
        }, 1000);
    }
}
