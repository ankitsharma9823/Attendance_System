import app from "./app";
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🌐 Backend running on port ${PORT}`);
});
const startBackgroundSync = async () => {
    try {
        console.log("🚀 Initializing startup sync...");
        const { startMachineSync } = await import("./modules/machine/machine.engine");
        await startMachineSync();
    }
    catch (err) {
        console.error("Startup sync failed:", err);
    }
};
setTimeout(startBackgroundSync, 0);
