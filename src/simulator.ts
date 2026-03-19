import { TrafficController } from './controller';
import type { ControllerSnapshot } from './types';

export interface ScheduledEvent {
  atSeconds: number;
  action: (controller: TrafficController) => void;
}

export interface SimulationOptions {
  totalSeconds: number;
  stepSeconds?: number;
  events?: ScheduledEvent[];
}

export function runSimulation(options: SimulationOptions): ControllerSnapshot[] {
  const controller = new TrafficController();
  const stepSeconds = options.stepSeconds ?? 0.5;

  if (options.totalSeconds < 0) {
    throw new Error('totalSeconds must be >= 0');
  }
  if (stepSeconds <= 0) {
    throw new Error('stepSeconds must be > 0');
  }

  const events = [...(options.events ?? [])].sort((a, b) => a.atSeconds - b.atSeconds);
  const snapshots: ControllerSnapshot[] = [controller.getSnapshot()];

  let eventIndex = 0;
  let elapsed = 0;

  while (elapsed < options.totalSeconds) {
    while (eventIndex < events.length && events[eventIndex].atSeconds <= elapsed + 1e-9) {
      events[eventIndex].action(controller);
      eventIndex += 1;
    }

    const dt = Math.min(stepSeconds, options.totalSeconds - elapsed);
    const snapshot = controller.step(dt);
    snapshots.push(snapshot);
    elapsed += dt;

    if (snapshot.emergencyOff) {
      break;
    }
  }

  return snapshots;
}
