// Simple test script for Entry CRUD API
const BASE_URL = "http://localhost:3000/api";

async function testAPI() {
  console.log("🧪 Testing Entry CRUD API\n");

  try {
    // Test 1: Create an entry (POST)
    console.log("1. Creating a meditation entry...");
    const createResponse = await fetch(`${BASE_URL}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "timed",
        name: "Morning Meditation",
        durationSeconds: 600,
        timestamp: new Date().toISOString(),
        data: { category: "sitting", mood: 5 },
        tags: ["meditation", "morning"],
        notes: "Very peaceful session",
      }),
    });
    const created = await createResponse.json();
    console.log("✅ Created entry:", created.id);
    const entryId = created.id;

    // Test 2: Get all entries (GET)
    console.log("\n2. Fetching all entries...");
    const listResponse = await fetch(`${BASE_URL}/entries`);
    const entries = await listResponse.json();
    console.log(`✅ Found ${entries.length} entries`);

    // Test 3: Filter by type (GET with query)
    console.log("\n3. Filtering by type=timed...");
    const filteredResponse = await fetch(`${BASE_URL}/entries?type=timed`);
    const filtered = await filteredResponse.json();
    console.log(`✅ Found ${filtered.length} timed entries`);

    // Test 4: Update entry (PATCH)
    console.log("\n4. Updating entry notes...");
    const updateResponse = await fetch(`${BASE_URL}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Updated: Even more peaceful!",
        tags: ["meditation", "morning", "peaceful"],
      }),
    });
    const updated = await updateResponse.json();
    console.log("✅ Updated entry:", updated.notes);

    // Test 5: Delete entry (DELETE - soft delete)
    console.log("\n5. Deleting entry...");
    const deleteResponse = await fetch(`${BASE_URL}/entries/${entryId}`, {
      method: "DELETE",
    });
    const deleted = await deleteResponse.json();
    console.log("✅ Deleted entry:", deleted.id);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testAPI();
