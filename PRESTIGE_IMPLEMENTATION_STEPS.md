# Prestige System Implementation Steps

This document describes the implementation order for the prestige button,
prestige reset flow, upgrade access, and equation-driven prestige rewards. The
flow is implemented in the current codebase; the steps below remain the
contract and extension guide for future prestige upgrades.

## Current relevant structure

- [`src/App.jsx`](./src/App.jsx) owns the React-level prestige popup state and
  passes purchase callbacks to the popup.
- [`src/components/PrestigePopup.jsx`](./src/components/PrestigePopup.jsx)
  displays the upgrade tree and already has a purchase button for the selected
  upgrade.
- [`src/data/prestigeTree.js`](./src/data/prestigeTree.js) is the declarative
  source for upgrade nodes, dependencies, labels, and descriptions.
- [`src/shops/prestigeShop.js`](./src/shops/prestigeShop.js) stores prestige
  upgrade levels, prices, and price equations.
- [`src/Server.js`](./src/Server.js) owns game state, points, collision
  processing, save/load, reset behavior, and prestige upgrade effects.
- [`src/circleboard/CircleBoard.js`](./src/circleboard/CircleBoard.js) reports
  wall hits and shape-to-shape collisions.
- [`src/circleboard/CollisionResponse.js`](./src/circleboard/CollisionResponse.js)
  should remain focused on physics. Prestige reward accounting should happen
  after collision results are returned, not inside the physics response class.

## Intended player flow

1. The player earns normal points from clicks and collisions.
2. The player opens the prestige menu from a clearly visible **Prestige**
   button near the clicker controls.
3. The menu shows:
   - current prestige points,
   - the estimated prestige points available from the current run,
   - the equation inputs used for that estimate,
   - the existing upgrade tree.
4. The player clicks **Prestige** and confirms the reset.
5. The current run is converted into permanent prestige points.
6. Run-only progress is reset, while purchased prestige upgrades remain.
7. The player can immediately reopen the upgrade menu and spend the new points.

## Step 1: Define the game-state contract before writing UI

Add a single documented state model for prestige calculations. Keep permanent
and run-only values separate:

```text
prestige:
  points                 // spendable permanent prestige-point balance
  lifetimePoints         // optional analytics value; never spendable
  lastAward              // result of the most recent prestige action
  totalPrestiges

run:
  totalPointsEarned
  totalCollisions
  totalWallHits
```

Use one source of truth in `Server`; do not derive prestige state independently
inside React. `PrestigePopup` should receive a snapshot through
`getPrestigeShopData()` or a new `getPrestigeData()` method.

## Step 2: Put equations in one reusable module

Create a small equation/configuration module rather than embedding formulas in
button handlers or individual components. For example:

```text
PRESTIGE_EQUATIONS = {
  minimumRunPoints: 1000,
  basePoints: (runPoints) => floor(runPoints / minimumRunPoints),
  collisionMultiplier: (totalCollisions) =>
    1 + log10(totalCollisions + 1),
  finalAward: (runPoints, totalCollisions, upgradeMultiplier) =>
    floor(
      basePoints(runPoints)
      * collisionMultiplier(totalCollisions)
      * upgradeMultiplier
    ),
}
```

The exact constants can be tuned later, but the implementation should preserve
these properties:

- `totalCollisions = 0` cannot award an accidental infinite or `NaN` value.
- The result is finite, non-negative, and deterministic.
- The collision multiplier grows more slowly than collision count so late-game
  values do not explode immediately.
- All formulas are named and testable independently.
- The UI can display the same formula inputs used by the server.

Recommended initial equation:

```text
basePrestigePoints = floor(totalPointsEarned / 1000)
collisionMultiplier = 1 + log10(totalCollisions + 1)
prestigeAward =
  floor(basePrestigePoints * collisionMultiplier * prestigeUpgradeMultiplier)
```

Do not multiply the already-awarded prestige balance by collisions. Multiply
only the current run's calculated award. This prevents repeated prestige clicks
from compounding the same run.

## Step 3: Track total collisions separately from the rolling rate

`CircleBoard` currently maintains rolling collision stacks for the per-second
display. Those values are not suitable for prestige because old entries are
removed from the rolling window.

Add a lifetime-for-this-run counter, such as `totalShapeCollisions`, and
increment it exactly when `CollisionResponse.handleCollision(...)` returns
`true`. Keep the existing rolling counters for FPS/rate display.

Decide explicitly whether wall hits count:

- Recommended: use shape-to-shape collisions for the requested
  “prestige points multiplied by total collisions” equation.
- Keep wall hits as a separate statistic unless a later upgrade explicitly
  includes them.

Expose a read-only getter from `CircleBoard` so `Server` does not reach into
implementation details.

## Step 4: Create one server-side prestige calculation method

Add a method with a name such as `calculatePrestigePreview()` that returns:

```text
{
  totalPointsEarned,
  totalCollisions,
  basePrestigePoints,
  collisionMultiplier,
  prestigeUpgradeMultiplier,
  estimatedAward,
  canPrestige
}
```

Add a separate `prestige()` method that:

1. Calls the same calculation method used for the preview.
2. Rejects the action with an explicit result if the minimum requirement is not
   met.
3. Adds the calculated award to the prestige shop balance.
4. Updates lifetime prestige statistics.
5. Resets run-only points and collision counters.
6. Recreates or resets run-only shops and shapes using the existing reset
   pathway.
7. Reapplies all permanent prestige upgrades after the reset.
8. Saves immediately.
9. Returns a structured result for the UI, including the awarded amount.

Avoid implementing a second, slightly different equation in the button click
handler.

## Step 5: Separate prestige reset from a full account reset

The existing reset path is useful, but prestige must not erase permanent
prestige upgrades or spendable prestige points.

Split the reset responsibilities into clearly named operations:

- `resetRunState()`:
  - normal points,
  - clicker progress if intended to be run-only,
  - base/click shop balances and levels if intended to reset,
  - shapes and collision counters.
- `resetAllProgress()`:
  - everything in `resetRunState()`,
  - prestige upgrade levels,
  - prestige points,
  - saved account state.
- `prestige()`:
  - award prestige points,
  - call `resetRunState()`,
  - preserve prestige upgrades and the new prestige balance.

Confirm the intended treatment of base shop levels and clicker levels before
implementation. The recommended default is to reset run economy but retain
prestige upgrades.

## Step 6: Add the main Prestige button

In [`src/App.jsx`](./src/App.jsx):

1. Add a **Prestige** button beside the pause/save/reset controls.
2. Add a handler that asks the server for the current prestige preview.
3. Disable the button when `canPrestige` is false.
4. Open a confirmation dialog showing the estimated award and what will reset.
5. Call `serverRef.current.prestige()` only after confirmation.
6. Force the React UI to refresh after success.
7. Show a success message containing the awarded prestige points.
8. Surface a failure reason if the server rejects the action.

The button should not directly mutate balances or reset canvases.

## Step 7: Make the prestige menu easy to extend

Update [`src/components/PrestigePopup.jsx`](./src/components/PrestigePopup.jsx)
to receive a complete prestige snapshot rather than only a balance when needed.
Add a compact summary panel above the tree containing:

- current prestige points,
- estimated points from this run,
- total collisions,
- collision multiplier,
- minimum requirement,
- a link/button to perform prestige if the design calls for it.

Keep upgrade definitions in [`src/data/prestigeTree.js`](./src/data/prestigeTree.js)
and matching shop entries in [`src/shops/prestigeShop.js`](./src/shops/prestigeShop.js).
For every new upgrade, update all three surfaces:

1. shop item data,
2. tree node data and dependency,
3. `Server.applyPrestigeUpgradeEffect`.

## Step 8: Add an upgrade route for extra prestige points

Add a new branch or path in the declarative prestige tree for upgrades that
increase prestige rewards. A possible first upgrade is:

```text
Increase Prestige Gain
effect: prestigeUpgradeMultiplier = 1 + level * 0.25
```

Recommended behavior:

- The upgrade affects only future prestige awards.
- It does not retroactively change points already earned.
- Its effect is included in the preview equation.
- It has a normal price equation and max level.
- It has a clear dependency in `requires`, so the connection line is generated
  automatically.

For the “connect triangle” request, use the triangle node as the parent or
child dependency in `requires`. Do not manually draw a separate line in CSS or
SVG. The existing `buildTree()` logic creates the edge from the dependency.
If the triangle upgrade does not exist yet, first add it as a normal data-driven
node and shop item, then connect the extra-prestige branch to its stable `id`.

## Step 9: Make equation authoring simple

Use a consistent item shape for every upgrade:

```text
{
  name,
  price,
  level,
  maxLevel,
  priceEquation(currentPrice, level),
  valueEquation(level),
  effectKey
}
```

Prefer named reusable equation helpers over anonymous formulas repeated across
items. For example:

```text
linearValue(base, perLevel)
scaledPrice(multiplier, additive)
prestigeGainMultiplier(level)
```

The UI should call `valueEquation` or a shared formatter to show the next
effect. The server should use the same configuration to apply the effect.
Avoid storing executable functions in localStorage; save only names, levels,
prices, and other serializable values.

## Step 10: Save and load safely

Update the saved state version when adding new prestige fields. On load:

- provide defaults for missing fields from older saves,
- clamp invalid negative or non-finite values,
- restore permanent upgrades before calculating the preview,
- never award prestige points merely because a save was loaded,
- remove any temporary test balance grants before release.

Pay particular attention to the current initial/test grants in
[`src/Server.js`](./src/Server.js); they should not be used to validate the
production prestige loop.

## Step 11: Validation checklist

### Equation tests

- Zero points and zero collisions produce zero or the documented minimum result.
- A run below the threshold cannot prestige.
- Increasing collisions increases the award according to the equation.
- Repeating the same preview without state changes returns the same result.
- Very large values remain finite and do not overflow the UI.
- Prestige gain upgrades affect only the multiplier they own.

### Reset tests

- Prestige awards points exactly once.
- A second click after success cannot award the same run again.
- Run points and run collision totals reset.
- Permanent prestige upgrades remain purchased.
- The upgrade menu shows the new balance immediately.
- A normal full reset still removes prestige progress if that remains intended.

### UI tests

- The main button is disabled or explains why it cannot be used.
- Confirmation text accurately lists what resets.
- The popup preview and server award match.
- The triangle connection appears through the tree dependency data.
- Locked upgrades remain inaccessible until their requirements are met.
- Purchase failures are visible instead of silently ignored.

### Regression checks

- Existing collision physics remains unchanged.
- Existing wall/shape collision rate displays still work.
- Save/load works with both old and new save versions.
- `npm run build` completes successfully.
- Test the feature in a narrow viewport and on a touch device because the
  prestige tree supports pan and pinch interactions.

## Suggested implementation order

1. Finalize reset rules and the exact prestige equation.
2. Add the shared equation/configuration helpers.
3. Add the lifetime collision counter and getter.
4. Add the server preview and prestige methods.
5. Split run reset from full reset.
6. Add the main Prestige button and confirmation flow.
7. Add the prestige summary to the upgrade menu.
8. Add the triangle dependency and extra-prestige upgrade path.
9. Update save/load versioning and migration defaults.
10. Add focused tests, run the build, and manually verify the full player flow.
