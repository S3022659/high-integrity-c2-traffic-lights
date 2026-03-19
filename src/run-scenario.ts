import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { loadScenarioFromFile, runScenario } from './scenario';

async function main(): Promise<void> {
  const scenarioPath = process.argv[2];

  if (!scenarioPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!existsSync(scenarioPath)) {
    console.error(`Scenario file not found: ${scenarioPath}`);
    process.exitCode = 1;
    return;
  }

  const loaded = await loadScenarioFromFile(scenarioPath);
  const snapshots = runScenario(loaded.definition);
  const scenarioLabel =
    relative(process.cwd(), loaded.scenarioPath) || loaded.scenarioPath;

  console.log(`Scenario: ${loaded.definition.name}`);
  console.log(`File: ${scenarioLabel}`);
  if (loaded.definition.description) {
    console.log(`Description: ${loaded.definition.description}`);
  }

  for (const snapshot of snapshots) {
    if (Number.isInteger(snapshot.timeSeconds)) {
      console.log(
        `${snapshot.timeSeconds}s phase=${snapshot.phase} NS=${snapshot.lanes.northbound} EW=${snapshot.lanes.eastbound} crossing=${snapshot.pedestrian.crossingActive}`
      );
    }
  }

  const latest = snapshots[snapshots.length - 1];
  if (latest.alerts.length > 0) {
    console.log('\nAlerts:');
    for (const alert of latest.alerts) {
      console.log(`- [${alert.code}] t=${alert.timeSeconds}s ${alert.message}`);
    }
  } else {
    console.log('\nAlerts: none');
  }
}

function printUsage(): void {
  console.log('Usage: npm run scenario -- <path-to-scenario-json>');
}

void main();
