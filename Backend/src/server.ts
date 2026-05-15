import app from "./app";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌐 Backend running on port ${PORT}`);
});

// FIX: Removed the test() call that was accidentally left in production code
setTimeout(async () => {
  try {
    console.log("🚀 Initializing fingerprint sync...");
    const { startMachineSync } = await import("./modules/machine/machine.engine");
    await startMachineSync();
  } catch (err) {
    console.error("❌ Startup sync failed:", err);
  }
}, 0);