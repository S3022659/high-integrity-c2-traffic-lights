# high-integrity-c2-traffic-lights

## Scenario 
 
The traffic lights control system is to be deployed at a new standard 4-way junction in the UK. This junction is the intersection of two perpendicular roads, with each road consisting of two lanes (one for each direction of travel). Each of these lanes has a corresponding traffic light installation, consisting of the usual Red, Amber and Green lights. These installations also have a traffic sensor that will detect whether a vehicle is waiting at the lights, and a separate pedestrian crossing subsystem. 

The state of each of these lights should be able to be monitored by the control software.

These light installations operate according to the following rules: 

## Rules
 
- An installation showing Red will transition to Red + Amber. 
- An installation showing Red + Amber transitions to Green. 
- An installation showing Green will transition to Amber. 
- An installation showing Amber will transition to Red. 

## Additional Rules
- Each installation operates synchronously with another paired installation. 
- Intermediate signals (Red+Amber and Amber) will be maintained for 1.5 
seconds. 
- Green signals will be maintained for 30s while the intersecting road has 
waiting traffic. 
- If the intersecting road is empty, Green signals may be maintained 
indefinitely. 
- If a pedestrian is waiting to cross, all traffic will be held for 15 seconds the 
next time all lights are on Red before resuming regular operation. 
- While pedestrians are expected to cross, an alert is sounded and a light 
illuminated. 

## Safety constraints 
A number of key safety constraints have been identified alongside the above rules in order to minimise risk amongst the traffic on the road and pedestrians attempting to cross. 
 
- No intersecting lanes should ever receive a signal that allows for traffic to 
pass simultaneously. 
- No traffic should be allowed to pass while pedestrians are crossing. 
- Paired installations must operate simultaneously at all times. 
- In the event of a traffic sensor failure, installations should revert to 30s limit on Green signals and monitoring system should raise an alert. 
- In the event that an installation does not progress to the next signal, the 
system should move to a state where all lights are off and raise an alert. 
- If a light fails to illuminate as expected, the system should move to a state 
where all lights are off and raise an alert. 
- If a light does not de-illuminate as expected, the system should move to a 
state where all installations are set to display no lights and raise an alert 

You are then required to model your understanding of the system and undertake a minimum of two of these analysis approaches to this study: STPA, FRAM or HAZOP. 

## Technical
- Use TypeScript
- Use Jest for unit tests
- Model system using UML
- Create diagrams using mermaid

## Simulation
- The software needs to be able to run in a simulation
- How does it respons to unexpected issues
- Does it enter an erroneous states
- The simulation should all control of this behaviour

## Project bootstrap status

An initial TypeScript implementation has been started in this repository.

### Included now

- Safety-focused traffic controller state machine for a 4-way junction.
- Paired installation behavior (NS synchronized, EW synchronized).
- UK signal sequence support: Red -> Red+Amber -> Green -> Amber -> Red.
- Timing rules:
  - Intermediate signals at 1.5s.
  - Green capped at 30s when intersecting traffic is waiting.
  - Green can remain indefinitely when intersecting traffic is empty.
  - Pedestrian request handled with 15s all-red hold at the next all-red phase.
- Fault behavior and alerts:
  - Sensor failure fallback to 30s green cap.
  - Transition failure fails safe to all-lights-off + alert.
  - Light illuminate/de-illuminate failure fails safe to all-lights-off + alert.
- Jest unit tests for key safety and timing behavior.
- Mermaid UML model and safety analyses (STPA + HAZOP).

## Repository layout

- `src/controller.ts`: Core control logic and safety constraints.
- `src/simulator.ts`: Time-stepped simulation harness.
- `src/types.ts`: Domain model and snapshot/alert types.
- `src/index.ts`: Example runnable simulation scenario.
- `tests/controller.test.ts`: Jest tests.
- `docs/uml-model.md`: Mermaid class and state diagrams.
- `docs/stpa.md`: STPA analysis.
- `docs/hazop.md`: HAZOP analysis.
- `docs/simulation.md`: Simulation guidance.

## Getting started

1. Install dependencies:

	```bash
	npm install
	```

2. Run tests:

	```bash
	npm test
	```

3. Build TypeScript:

	```bash
	npm run build
	```

4. Run the sample simulation:

	```bash
	npm start
	```