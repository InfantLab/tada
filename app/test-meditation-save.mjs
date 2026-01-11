// Test saving a meditation entry
const baseUrl = "http://localhost:3002";

async function testMeditationSave() {
  try {
    // First login
    console.log("Logging in...");
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "caspar",
        password: "test123",
      }),
    });

    if (!loginResponse.ok) {
      console.error("Login failed:", await loginResponse.text());
      return;
    }

    // Get session cookie
    const cookies = loginResponse.headers.get("set-cookie");
    console.log("Logged in successfully");

    // Create a meditation entry
    console.log("\nCreating meditation entry...");
    const entry = {
      type: "timed",
      name: "Test Meditation (5m)",
      timestamp: new Date().toISOString(),
      durationSeconds: 300,
      data: {
        mode: "countdown",
        category: "sitting",
        targetMinutes: 5,
      },
      tags: ["meditation", "sitting"],
    };

    const createResponse = await fetch(`${baseUrl}/api/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify(entry),
    });

    if (!createResponse.ok) {
      console.error("Create failed:", await createResponse.text());
      return;
    }

    const created = await createResponse.json();
    console.log("Created entry:", created);

    // Fetch all entries
    console.log("\nFetching entries...");
    const fetchResponse = await fetch(`${baseUrl}/api/entries`, {
      headers: { Cookie: cookies },
    });

    if (!fetchResponse.ok) {
      console.error("Fetch failed:", await fetchResponse.text());
      return;
    }

    const entries = await fetchResponse.json();
    console.log(`\nTotal entries: ${entries.length}`);
    console.log("Entry types:", entries.map((e) => e.type).join(", "));
    console.log(
      "\nRecent entries:",
      entries.slice(0, 5).map((e) => ({ type: e.type, name: e.name }))
    );
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testMeditationSave();
