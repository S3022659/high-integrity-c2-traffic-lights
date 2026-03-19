# STPA (Initial)

## Step 1: Accidents and Losses

- A1: Collision between intersecting traffic flows.
- A2: Collision between vehicles and pedestrians crossing.
- A3: Unsafe behavior during component failure due to loss of control.

## Step 2: Hazards

- H1: Intersecting lanes both receive pass signal.
- H2: Any lane receives pass signal while pedestrian crossing is active.
- H3: Paired installations diverge, causing contradictory signals on same road axis.
- H4: Faults are not detected and the system continues in unknown state.

## Step 3: Unsafe Control Actions

- UCA1: Controller sets both road axes to green.
- UCA2: Controller leaves green active when pedestrian crossing should be protected by all-red.
- UCA3: Controller omits emergency shutdown after transition or lamp fault.
- UCA4: Controller allows indefinite green under sensor failure.

## Step 4: Safety Constraints and Mitigations

- SC1: Never emit green to both axes simultaneously.
- SC2: During pedestrian crossing, both axes must remain red.
- SC3: Pair synchronization is mandatory: north/south and east/west always match.
- SC4: Any transition/lamp fault must force emergency all-off and alert.
- SC5: Any traffic sensor fault must trigger alert and cap green phase to 30s.

## Validation in Code

- `applySignals` blocks conflicting green and pedestrian/traffic conflicts.
- Fault injection methods force deterministic fail-safe transitions.
- Snapshot model surfaces alerts and emergency status for monitoring.
