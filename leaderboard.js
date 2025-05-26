// Mock/Dummy global variables and functions for demonstration
let playerAvatar = "default_avatar.png";

function getCurrentKsaDateString() {
  // Returns a string like "2023-10-27"
  // For testing, let's return a fixed date
  return "2023-10-27";
}

// Mock Firestore (fb) and database (db) objects
const mockFirestoreData = {
  "leaderboard_scores": {
    "doc1": { playerName: "PlayerOld", ksaDate: "2023-10-27", score: 100, playerAvatar: "old_avatar.png" },
    "doc2": { playerName: "PlayerAnother", ksaDate: "2023-10-27", score: 150, playerAvatar: "another_avatar.png" },
    "doc3": { playerName: "PlayerOld", ksaDate: "2023-10-26", score: 90, playerAvatar: "old_avatar.png" }, // Different date
    "doc4": { playerName: "PlayerOld", ksaDate: "2023-10-27", score: 120, playerAvatar: "old_avatar.png" },
  }
};

const fb = {
  collection: (dbRef, collectionName) => {
    console.log(`fb.collection called with collectionName: ${collectionName}`);
    return { collectionName, dbRef }; // Return a descriptor
  },
  query: (collectionRef, ...constraints) => {
    console.log(`fb.query called for collection: ${collectionRef.collectionName}`);
    return { collectionRef, constraints };
  },
  where: (field, operator, value) => {
    console.log(`fb.where called: ${field} ${operator} ${value}`);
    return { type: "where", field, operator, value };
  },
  getDocs: async (queryRef) => {
    console.log(`fb.getDocs called for query on: ${queryRef.collectionRef.collectionName}`);
    const { collectionRef, constraints } = queryRef;
    const collectionName = collectionRef.collectionName;
    
    if (!mockFirestoreData[collectionName]) {
      console.error(`Collection ${collectionName} not found in mock data.`);
      return { docs: [] };
    }

    let results = Object.entries(mockFirestoreData[collectionName]).map(([id, data]) => ({ id, ...data }));

    constraints.forEach(constraint => {
      if (constraint.type === "where") {
        results = results.filter(doc => {
          // Basic filter, doesn't handle all Firestore operators
          if (constraint.operator === "==") {
            return doc[constraint.field] === constraint.value;
          }
          return false;
        });
      }
    });
    console.log(`fb.getDocs: Found ${results.length} documents.`);
    return { docs: results.map(docData => ({ id: docData.id, data: () => ({...docData}) })) };
  },
  doc: (collectionRef, docId) => {
    console.log(`fb.doc called for docId: ${docId} in collection: ${collectionRef.collectionName}`);
    return { collectionName: collectionRef.collectionName, id: docId, dbRef: collectionRef.dbRef };
  },
  updateDoc: async (docRef, updates) => {
    console.log(`fb.updateDoc called for docId: ${docRef.id} with updates:`, updates);
    const { collectionName, id } = docRef;
    if (mockFirestoreData[collectionName] && mockFirestoreData[collectionName][id]) {
      mockFirestoreData[collectionName][id] = { ...mockFirestoreData[collectionName][id], ...updates };
      console.log(`Document ${id} in ${collectionName} updated successfully in mock data.`);
      return Promise.resolve();
    } else {
      console.error(`Document ${id} in ${collectionName} not found for update.`);
      return Promise.reject(new Error(`Mock document ${id} not found in ${collectionName}`));
    }
  }
};

const db = {
  // This mock db object is just a conceptual placeholder for the Firestore instance.
  // fb.collection now takes this 'db' as its first argument.
  name: "mockDbInstance"
};

async function loadLeaderboardData() {
  console.log("Global loadLeaderboardData called. (Mock implementation)");
  // In a real scenario, this would fetch data and store it locally.
  return Promise.resolve();
}

function updateLeaderboard() {
  console.log("Global updateLeaderboard called. (Mock implementation - UI would refresh here)");
  // In a real scenario, this would update the HTML display.
  console.log("Current Mock Firestore Data (for verification):", JSON.stringify(mockFirestoreData, null, 2));
}

// Function to be implemented
async function updateLeaderboardWithNewName(oldName, newName) {
  console.log(`updateLeaderboardWithNewName called with oldName: "${oldName}", newName: "${newName}"`);

  const currentAvatar = playerAvatar; // Use global playerAvatar
  const ksaDate = getCurrentKsaDateString();
  console.log(`Using KSA Date: ${ksaDate}, Player Avatar: ${currentAvatar}`);

  try {
    const scoresCollectionRef = fb.collection(db, 'leaderboard_scores');
    const q = fb.query(scoresCollectionRef, 
                      fb.where('playerName', '==', oldName), 
                      fb.where('ksaDate', '==', ksaDate));

    console.log("Querying Firestore for documents to update...");
    const querySnapshot = await fb.getDocs(q);

    if (querySnapshot.docs.length === 0) {
      console.log(`No documents found for playerName: "${oldName}" and ksaDate: "${ksaDate}". No updates needed.`);
    } else {
      console.log(`Found ${querySnapshot.docs.length} documents to update for playerName: "${oldName}" on ${ksaDate}.`);
    }

    for (const document of querySnapshot.docs) {
      console.log(`Processing document ID: ${document.id}, Data:`, document.data());
      const docRef = fb.doc(scoresCollectionRef, document.id); // Pass collectionRef and docId
      
      try {
        await fb.updateDoc(docRef, {
          playerName: newName,
          playerAvatar: currentAvatar 
        });
        console.log(`Successfully updated document ID: ${document.id} to newName: "${newName}" and playerAvatar: "${currentAvatar}"`);
      } catch (error) {
        console.error(`Error updating document ID: ${document.id}:`, error);
      }
    }

    console.log("Completed processing all document updates for updateLeaderboardWithNewName.");

  } catch (error) {
    console.error("Error during updateLeaderboardWithNewName process:", error);
  }

  // Refresh local data and update UI
  console.log("Calling loadLeaderboardData()...");
  await loadLeaderboardData();
  console.log("Calling updateLeaderboard()...");
  updateLeaderboard();
  console.log("updateLeaderboardWithNewName finished.");
}

// Example Usage (for testing purposes, normally called from saveProfile)
(async () => {
  if (typeof require !== 'undefined' && require.main === module) {
    console.log("--- Running Test Scenario 1: Update 'PlayerOld' to 'PlayerNew' ---");
    playerAvatar = "new_avatar_for_player_new.png"; // Set a new avatar for the test
    await updateLeaderboardWithNewName("PlayerOld", "PlayerNew");
    
    console.log("\n--- Running Test Scenario 2: Attempt to update non-existent player 'NonExistentPlayer' ---");
    await updateLeaderboardWithNewName("NonExistentPlayer", "MysteryPlayer");

    console.log("\n--- Running Test Scenario 3: Update 'PlayerAnother' to 'PlayerUpdatedAnother' ---");
    playerAvatar = "updated_avatar_for_another.png";
    // Modify mock data to ensure 'PlayerAnother' has an entry for the current ksaDate
    // This was already present: "doc2": { playerName: "PlayerAnother", ksaDate: "2023-10-27", score: 150, playerAvatar: "another_avatar.png" },
    await updateLeaderboardWithNewName("PlayerAnother", "PlayerUpdatedAnother");

    console.log("\n--- Verifying final state of mock data ---");
    console.log(JSON.stringify(mockFirestoreData, null, 2));
  }
})();

module.exports = { updateLeaderboardWithNewName, getCurrentKsaDateString, loadLeaderboardData, updateLeaderboard, setPlayerAvatar: (avatar) => playerAvatar = avatar, getPlayerAvatar: () => playerAvatar, mockFirestoreData, fb, db };
