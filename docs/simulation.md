# Simulation Notes

Simulation is run by `runSimulation` in `src/simulator.ts`.

## JSON scenario runner

Run a case file with:

```bash
npm run scenario -- scenarios/peak-ew-with-pedestrian.json
```

Scenario files are loaded and validated by `src/scenario.ts`.

Supported event kinds:

- `traffic` with `axis` (`NS` or `EW`) and `waiting` (`true` or `false`)
- `pedestrian`
- `sensorFailure` with `axis`
- `transitionFailure` with `axis`
- `lightFailure` with `failureKind` (`illuminate` or `deilluminate`)

Minimal schema:

```json
{
	"name": "Case Name",
	"totalSeconds": 70,
	"stepSeconds": 1,
	"events": [
		{ "atSeconds": 5, "kind": "traffic", "axis": "EW", "waiting": true },
		{ "atSeconds": 10, "kind": "pedestrian" }
	]
}
```

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
