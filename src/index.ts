import { runSimulation } from './simulator';

const snapshots = runSimulation({
  totalSeconds: 70,
  stepSeconds: 1,
  events: [
    {
      atSeconds: 5,
      action: (controller) => controller.setTrafficDetected('EW', true)
    },
    {
      atSeconds: 10,
      action: (controller) => controller.requestPedestrianCrossing()
    }
  ]
});

for (const snapshot of snapshots) {
  if (Number.isInteger(snapshot.timeSeconds)) {
    console.log(
      `${snapshot.timeSeconds}s phase=${snapshot.phase} NS=${snapshot.lanes.northbound} EW=${snapshot.lanes.eastbound} crossing=${snapshot.pedestrian.crossingActive}`
    );
  }
}

if (snapshots[snapshots.length - 1].alerts.length > 0) {
  console.log('\nAlerts:');
  for (const alert of snapshots[snapshots.length - 1].alerts) {
    console.log(`- [${alert.code}] t=${alert.timeSeconds}s ${alert.message}`);
  }
}
