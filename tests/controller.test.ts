import { TrafficController } from '../src/controller';

describe('TrafficController', () => {
  const assertInvariantI1NoConflictingGreens = (controller: TrafficController): void => {
    const snapshot = controller.getSnapshot();
    const nsGreen = snapshot.lanes.northbound === 'GREEN';
    const ewGreen = snapshot.lanes.eastbound === 'GREEN';

    expect(nsGreen && ewGreen).toBe(false);
  };

  test('throws when stepping with negative delta seconds', () => {
    const controller = new TrafficController();

    expect(() => controller.step(-0.1)).toThrow('step deltaSeconds must be >= 0');
  });

  test('zero-second step keeps state unchanged', () => {
    const controller = new TrafficController();
    const before = controller.getSnapshot();

    controller.step(0);
    const after = controller.getSnapshot();

    expect(after.timeSeconds).toBe(before.timeSeconds);
    expect(after.phase).toBe(before.phase);
    expect(after.lanes).toEqual(before.lanes);
  });

  test('holds green indefinitely when intersecting road is empty and sensors healthy', () => {
    const controller = new TrafficController();

    controller.step(120);
    const snapshot = controller.getSnapshot();

    expect(snapshot.phase).toBe('NS_GREEN');
    expect(snapshot.lanes.northbound).toBe('GREEN');
    expect(snapshot.lanes.eastbound).toBe('RED');
    expect(snapshot.alerts).toHaveLength(0);
  });

  test('limits green to 30 seconds when intersecting road has waiting traffic', () => {
    const controller = new TrafficController();
    controller.setTrafficDetected('EW', true);

    controller.step(33.01);
    const snapshot = controller.getSnapshot();

    expect(snapshot.phase).toBe('EW_GREEN');
    expect(snapshot.lanes.northbound).toBe('RED');
    expect(snapshot.lanes.eastbound).toBe('GREEN');
  });

  test('holds all traffic red for 15 seconds on pending pedestrian request', () => {
    const controller = new TrafficController();
    controller.setTrafficDetected('EW', true);
    controller.requestPedestrianCrossing();

    controller.step(31.6);
    const enteringAllRed = controller.getSnapshot();

    expect(enteringAllRed.phase).toBe('ALL_RED_BEFORE_EW');
    expect(enteringAllRed.pedestrian.crossingActive).toBe(true);
    expect(enteringAllRed.lanes.northbound).toBe('RED');
    expect(enteringAllRed.lanes.eastbound).toBe('RED');

    controller.step(14.8);
    const stillCrossing = controller.getSnapshot();
    expect(stillCrossing.pedestrian.crossingActive).toBe(true);

    controller.step(0.3);
    const resumedCycle = controller.getSnapshot();
    expect(resumedCycle.phase).toBe('EW_RED_AMBER');
    expect(resumedCycle.pedestrian.crossingActive).toBe(false);
  });

  test('sensor failure triggers alert and fixed 30 second green cap', () => {
    const controller = new TrafficController();
    controller.injectSensorFailure('EW');

    controller.step(33.01);
    const snapshot = controller.getSnapshot();

    expect(snapshot.phase).toBe('EW_GREEN');
    expect(snapshot.alerts.some((a) => a.code === 'SENSOR_FAILURE')).toBe(true);
  });

  test('ignores traffic updates for a failed sensor axis', () => {
    const controller = new TrafficController();
    controller.setTrafficDetected('EW', true);
    controller.injectSensorFailure('EW');
    controller.setTrafficDetected('EW', false);

    controller.step(33.01);
    const snapshot = controller.getSnapshot();

    expect(snapshot.phase).toBe('EW_GREEN');
  });

  test('transition failure causes emergency all-off state', () => {
    const controller = new TrafficController();
    controller.setTrafficDetected('EW', true);
    controller.injectTransitionFailure('EW');

    controller.step(33.1);
    const snapshot = controller.getSnapshot();

    expect(snapshot.emergencyOff).toBe(true);
    expect(snapshot.lanes.northbound).toBe('OFF');
    expect(snapshot.lanes.eastbound).toBe('OFF');
    expect(snapshot.alerts.some((a) => a.code === 'TRANSITION_FAILURE')).toBe(true);
    expect(snapshot.alerts.some((a) => a.code === 'EMERGENCY_OFF')).toBe(true);
  });

  test('light illuminate failure causes emergency all-off state', () => {
    const controller = new TrafficController();
    controller.setTrafficDetected('EW', true);
    controller.injectLightFailure('illuminate');

    controller.step(30.1);
    const snapshot = controller.getSnapshot();

    expect(snapshot.emergencyOff).toBe(true);
    expect(snapshot.alerts.some((a) => a.code === 'LIGHT_ILLUMINATE_FAILURE')).toBe(true);
  });

  // Formal traceability target:
  // docs/formal-requirements.md
  describe('Formal safety contracts (Hoare-derived)', () => {
    // Formal traceability:
    // SR-1, I1
    // { true } step(dt) { !(NS_GREEN && EW_GREEN) }
    // Invariant: intersecting roads never receive simultaneous pass signals.
    test('SR-1_I1__no_conflicting_greens', () => {
      const controller = new TrafficController();

      controller.setTrafficDetected('EW', true);

      for (let i = 0; i < 20; i += 1) {
        controller.step(2);
        assertInvariantI1NoConflictingGreens(controller);
      }
    });

    // Formal traceability:
    // SR-2, I2
    // { crossingActive = true } step(dt) { NS != GREEN && EW != GREEN }
    // Invariant: pedestrian crossing excludes all traffic pass signals.
    test('SR-2_I2__pedestrian_crossing_blocks_traffic_green', () => {
      const controller = new TrafficController();

      controller.setTrafficDetected('EW', true);
      controller.requestPedestrianCrossing();

      controller.step(31.6);
      const duringCrossing = controller.getSnapshot();

      expect(duringCrossing.pedestrian.crossingActive).toBe(true);
      expect(duringCrossing.lanes.northbound).not.toBe('GREEN');
      expect(duringCrossing.lanes.eastbound).not.toBe('GREEN');
    });

    // Formal traceability:
    // SR-3, I3
    // { transition fault injected } step(dt) { emergencyOff && NS=OFF && EW=OFF }
    // Invariant: emergency-off mode enforces fail-safe all-off lights.
    test('SR-3_I3__transition_fault_forces_emergency_all_off', () => {
      const controller = new TrafficController();

      controller.setTrafficDetected('EW', true);
      controller.injectTransitionFailure('EW');
      controller.step(33.1);

      const snapshot = controller.getSnapshot();
      expect(snapshot.emergencyOff).toBe(true);
      expect(snapshot.lanes.northbound).toBe('OFF');
      expect(snapshot.lanes.eastbound).toBe('OFF');
    });
  });
});
