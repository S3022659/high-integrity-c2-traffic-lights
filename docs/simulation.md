# Simulation Notes

Simulation is run by `runSimulation` in `src/simulator.ts`.

## Capabilities

- Time-stepped execution.
- Scheduled scenario events (traffic, pedestrian request, fault injection).
- Snapshots for each step including lane aspects, pedestrian status, and alerts.
- Early stop if emergency-off state is reached.

## Example Scenario Ideas

- Peak flow on EW with occasional NS traffic.
- Pedestrian request bursts during phase swaps.
- Sensor failure during sustained low traffic.
- Lamp and transition faults during intermediate phases.

## What to Observe

- Whether safety constraints are maintained before faults.
- Whether faults trigger emergency-off deterministically.
- Whether the controller ever enters contradictory or impossible states.
