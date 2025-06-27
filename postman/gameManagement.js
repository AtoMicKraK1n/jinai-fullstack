// Create new game
// pre-request

// Generate unique pool ID
const poolId =
  "pool_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
pm.environment.set("POOL_ID", poolId);

// Update request body with generated pool ID
const requestBody = {
  poolId: poolId,
  entryFee: "0.1",
  maxPlayers: 4,
};

pm.request.body.raw = JSON.stringify(requestBody, null, 2);

// post-response

pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Game created successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("success");
  pm.expect(jsonData.success).to.be.true;
  pm.expect(jsonData).to.have.property("game");
});

pm.test("Game has correct structure", function () {
  const jsonData = pm.response.json();
  const game = jsonData.game;
  pm.expect(game).to.have.property("id");
  pm.expect(game).to.have.property("poolId");
  pm.expect(game).to.have.property("status");
  pm.expect(game).to.have.property("currentPlayers");
  pm.expect(game).to.have.property("maxPlayers");
  pm.expect(game).to.have.property("entryFee");
  pm.expect(game).to.have.property("prizePool");
});

pm.test("Game has correct initial values", function () {
  const jsonData = pm.response.json();
  const game = jsonData.game;
  pm.expect(game.status).to.equal("WAITING");
  pm.expect(game.currentPlayers).to.equal(1);
  pm.expect(game.maxPlayers).to.equal(4);
  pm.expect(parseFloat(game.entryFee)).to.equal(0.1);
});

pm.test("Set game ID for future tests", function () {
  const jsonData = pm.response.json();
  if (jsonData.success) {
    pm.environment.set("GAME_ID", jsonData.game.id);
    console.log("Game ID set:", jsonData.game.id);
    console.log("Pool ID:", jsonData.game.poolId);
  }
});

// List available games

pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has games array", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("success");
  pm.expect(jsonData).to.have.property("games");
  pm.expect(jsonData.games).to.be.an("array");
});

pm.test("Games have correct structure", function () {
  const jsonData = pm.response.json();
  if (jsonData.games.length > 0) {
    const game = jsonData.games[0];
    pm.expect(game).to.have.property("id");
    pm.expect(game).to.have.property("poolId");
    pm.expect(game).to.have.property("status");
    pm.expect(game).to.have.property("currentPlayers");
    pm.expect(game).to.have.property("maxPlayers");
    pm.expect(game).to.have.property("participants");
    pm.expect(game.participants).to.be.an("array");
  }
});

pm.test("All games are waiting", function () {
  const jsonData = pm.response.json();
  jsonData.games.forEach((game) => {
    pm.expect(game.status).to.equal("WAITING");
    pm.expect(game.currentPlayers).to.be.lessThan(4);
  });
});
