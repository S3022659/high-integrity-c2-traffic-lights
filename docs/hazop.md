# HAZOP (Initial)

## Scope

Control logic for a 4-way UK junction with paired traffic light installations, traffic sensors, and pedestrian crossing hold behavior.

## Guide Words / Deviations

| Parameter | Guide Word | Deviation | Potential Cause | Consequence | Existing Safeguard | Recommendation |
|---|---|---|---|---|---|---|
| Signal to NS axis | More | Green when EW is also green | Logic defect | Intersecting collision | Safety conflict check -> emergency off | Add property-based tests across long simulations |
| Signal transition | No | No transition to next phase | Installation stuck | Deadlock / unsafe stale display | Transition failure -> emergency off | Add watchdog timer telemetry |
| Lamp output | Other than | Lamp fails to illuminate/de-illuminate | Hardware fault | Driver confusion, unsafe assumption | Lamp fault -> emergency off | Integrate lamp diagnostics heartbeat |
| Sensor input | No | Missing traffic detection | Sensor failure | Starvation or unfair flow | 30s cap fallback + alert | Add sensor redundancy strategy |
| Pedestrian protection | Early/Late | Crossing hold absent or too short | State/timing bug | Pedestrian struck by traffic | 15s all-red hold implementation | Add timing tolerance monitors |

## Initial Risk Reduction Summary

- High severity hazards are handled with fail-safe all-off mode.
- Monitoring outputs (`alerts`) make failures observable by external systems.
- Additional assurance should include runtime watchdogs, hardware diagnostics, and stochastic simulation campaigns.
