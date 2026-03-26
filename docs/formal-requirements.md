# Formal Safety Requirements (Hoare Logic)

This document represents core safety requirements using Hoare-style pre/postconditions
and global invariants for the traffic-light controller.

Machine-readable requirement IDs and test IDs are defined in `docs/formal-requirements.yaml`.

## State And Notation

- `S.phase`: controller phase before a command
- `S'.phase`: controller phase after a command
- `S.lanes.northbound`, `S.lanes.eastbound`: effective movement aspects
- `S.pedestrian.crossingActive`: pedestrian crossing hold state
- `step(dt)`: execute controller time progression by `dt` seconds

Hoare triples are written as:

`{Precondition} command {Postcondition}`

## Safety Contracts

### SR-1 / I1: No conflicting traffic greens

`{ true } step(dt) { not (S'.lanes.northbound = GREEN and S'.lanes.eastbound = GREEN) }`

Invariant `I1`:

`forall reachable states S: not (S.lanes.northbound = GREEN and S.lanes.eastbound = GREEN)`

### SR-2 / I2: Pedestrian hold excludes traffic green

`{ S.pedestrian.crossingActive = true } step(dt) { S'.lanes.northbound != GREEN and S'.lanes.eastbound != GREEN }`

Invariant `I2`:

`forall reachable states S: S.pedestrian.crossingActive -> (S.lanes.northbound != GREEN and S.lanes.eastbound != GREEN)`

### SR-3 / I3: Transition fault leads to fail-safe all-off state

`{ transition fault injected for an upcoming phase } step(dt) { S'.emergencyOff = true and S'.lanes.northbound = OFF and S'.lanes.eastbound = OFF }`

Invariant `I3`:

`forall reachable states S: S.emergencyOff -> (S.lanes.northbound = OFF and S.lanes.eastbound = OFF)`

## Traceability Matrix

| Requirement ID | Formal Statement (Short) | Evidence Test |
|---|---|---|
| SR-1 / I1 | Never both NS and EW green | `tests/controller.test.ts` -> `SR-1_I1__no_conflicting_greens` |
| SR-2 / I2 | Pedestrian crossing implies no traffic green | `tests/controller.test.ts` -> `SR-2_I2__pedestrian_crossing_blocks_traffic_green` |
| SR-3 / I3 | Transition fault implies emergency all-off | `tests/controller.test.ts` -> `SR-3_I3__transition_fault_forces_emergency_all_off` |
