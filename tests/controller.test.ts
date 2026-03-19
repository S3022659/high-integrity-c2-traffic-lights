import { TrafficController } from '../src/controller';

describe('TrafficController', () => {
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
    expect(snapshot.alerts.some((a) => a.code === 'LIGHT_ILLUMINATE_FAILURE')).toBe(
      true
    );
  });
});
