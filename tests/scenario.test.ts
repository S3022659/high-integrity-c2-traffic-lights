import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  loadScenarioFromFile,
  runScenario,
  scenarioToSimulationOptions
} from '../src/scenario';

describe('JSON scenario runner', () => {
  test('maps scenario definition to simulation options', () => {
    const definition = {
      name: 'Simple Map Test',
      totalSeconds: 12,
      stepSeconds: 0.5,
      events: [
        { atSeconds: 1, kind: 'traffic' as const, axis: 'EW' as const, waiting: true },
        { atSeconds: 2, kind: 'pedestrian' as const }
      ]
    };

    const options = scenarioToSimulationOptions(definition);

    expect(options.totalSeconds).toBe(12);
    expect(options.stepSeconds).toBe(0.5);
    expect(options.events).toHaveLength(2);
  });

  test('pedestrian event in scenario sets pedestrian waiting state', () => {
    const snapshots = runScenario({
      name: 'Pedestrian Event',
      totalSeconds: 10,
      stepSeconds: 1,
      events: [{ atSeconds: 1, kind: 'pedestrian' }]
    });

    expect(snapshots.some((snapshot) => snapshot.pedestrian.waiting)).toBe(true);
  });

  test('loads and executes sample pedestrian scenario from JSON file', async () => {
    const scenarioPath = resolve(
      __dirname,
      '..',
      'scenarios',
      'peak-ew-with-pedestrian.json'
    );

    const loaded = await loadScenarioFromFile(scenarioPath);
    const snapshots = runScenario(loaded.definition);
    const final = snapshots[snapshots.length - 1];

    expect(loaded.definition.name).toBe('Peak EW with Pedestrian Request');
    expect(snapshots.length).toBeGreaterThan(2);
    expect(final.emergencyOff).toBe(false);
  });

  test('loads transition failure scenario and enters emergency off', async () => {
    const scenarioPath = resolve(
      __dirname,
      '..',
      'scenarios',
      'transition-failure-ew.json'
    );

    const loaded = await loadScenarioFromFile(scenarioPath);
    const snapshots = runScenario(loaded.definition);
    const final = snapshots[snapshots.length - 1];

    expect(final.emergencyOff).toBe(true);
    expect(final.alerts.some((alert) => alert.code === 'TRANSITION_FAILURE')).toBe(true);
  });

  test('rejects invalid scenario event kind', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'traffic-scenario-'));
    const badScenarioPath = join(dir, 'invalid.json');

    await writeFile(
      badScenarioPath,
      JSON.stringify({
        name: 'Invalid Scenario',
        totalSeconds: 10,
        events: [{ atSeconds: 1, kind: 'unknown-event' }]
      })
    );

    await expect(loadScenarioFromFile(badScenarioPath)).rejects.toThrow(
      'must be one of traffic, pedestrian, sensorFailure, transitionFailure, lightFailure'
    );

    await rm(dir, { recursive: true, force: true });
  });
});
