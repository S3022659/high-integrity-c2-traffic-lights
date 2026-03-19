import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TrafficController } from './controller';
import type { RoadAxis } from './types';
import type { ScheduledEvent, SimulationOptions } from './simulator';
import { runSimulation } from './simulator';

type LightFailureKind = 'illuminate' | 'deilluminate';
type ScenarioEventKind =
  | 'traffic'
  | 'pedestrian'
  | 'sensorFailure'
  | 'transitionFailure'
  | 'lightFailure';

interface ScenarioEventBase {
  atSeconds: number;
  kind: ScenarioEventKind;
}

export interface TrafficScenarioEvent extends ScenarioEventBase {
  kind: 'traffic';
  axis: RoadAxis;
  waiting: boolean;
}

export interface PedestrianScenarioEvent extends ScenarioEventBase {
  kind: 'pedestrian';
}

export interface SensorFailureScenarioEvent extends ScenarioEventBase {
  kind: 'sensorFailure';
  axis: RoadAxis;
}

export interface TransitionFailureScenarioEvent extends ScenarioEventBase {
  kind: 'transitionFailure';
  axis: RoadAxis;
}

export interface LightFailureScenarioEvent extends ScenarioEventBase {
  kind: 'lightFailure';
  failureKind: LightFailureKind;
}

export type ScenarioEvent =
  | TrafficScenarioEvent
  | PedestrianScenarioEvent
  | SensorFailureScenarioEvent
  | TransitionFailureScenarioEvent
  | LightFailureScenarioEvent;

export interface ScenarioDefinition {
  name: string;
  description?: string;
  totalSeconds: number;
  stepSeconds?: number;
  events: ScenarioEvent[];
}

export interface LoadedScenario {
  scenarioPath: string;
  definition: ScenarioDefinition;
}

export async function loadScenarioFromFile(
  scenarioPath: string
): Promise<LoadedScenario> {
  const absolutePath = resolve(scenarioPath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const definition = parseScenarioDefinition(parsed, absolutePath);

  return {
    scenarioPath: absolutePath,
    definition
  };
}

export function scenarioToSimulationOptions(
  definition: ScenarioDefinition
): SimulationOptions {
  return {
    totalSeconds: definition.totalSeconds,
    stepSeconds: definition.stepSeconds,
    events: definition.events.map(mapScenarioEvent)
  };
}

export function runScenario(definition: ScenarioDefinition) {
  return runSimulation(scenarioToSimulationOptions(definition));
}

function mapScenarioEvent(event: ScenarioEvent): ScheduledEvent {
  return {
    atSeconds: event.atSeconds,
    action: (controller: TrafficController) => {
      switch (event.kind) {
        case 'traffic':
          controller.setTrafficDetected(event.axis, event.waiting);
          return;
        case 'pedestrian':
          controller.requestPedestrianCrossing();
          return;
        case 'sensorFailure':
          controller.injectSensorFailure(event.axis);
          return;
        case 'transitionFailure':
          controller.injectTransitionFailure(event.axis);
          return;
        case 'lightFailure':
          controller.injectLightFailure(event.failureKind);
          return;
        default:
          assertNever(event);
      }
    }
  };
}

function parseScenarioDefinition(
  value: unknown,
  scenarioPath: string
): ScenarioDefinition {
  if (!isObject(value)) {
    throw new Error(`Scenario file ${scenarioPath} must contain a JSON object.`);
  }

  const name = asNonEmptyString(value.name, 'name', scenarioPath);
  const totalSeconds = asNonNegativeNumber(
    value.totalSeconds,
    'totalSeconds',
    scenarioPath
  );

  let stepSeconds: number | undefined;
  if (value.stepSeconds !== undefined) {
    stepSeconds = asPositiveNumber(value.stepSeconds, 'stepSeconds', scenarioPath);
  }

  const description =
    value.description === undefined
      ? undefined
      : asNonEmptyString(value.description, 'description', scenarioPath);

  const rawEvents = value.events;
  if (!Array.isArray(rawEvents)) {
    throw new Error(`Scenario file ${scenarioPath} must contain events array.`);
  }

  const events = rawEvents.map((event, index) =>
    parseScenarioEvent(event, scenarioPath, index)
  );

  return {
    name,
    description,
    totalSeconds,
    stepSeconds,
    events
  };
}

function parseScenarioEvent(
  value: unknown,
  scenarioPath: string,
  index: number
): ScenarioEvent {
  if (!isObject(value)) {
    throw new Error(
      `Scenario file ${scenarioPath} event at index ${index} must be an object.`
    );
  }

  const atSeconds = asNonNegativeNumber(
    value.atSeconds,
    `events[${index}].atSeconds`,
    scenarioPath
  );
  const kind = asScenarioEventKind(value.kind, `events[${index}].kind`, scenarioPath);

  switch (kind) {
    case 'traffic':
      return {
        atSeconds,
        kind,
        axis: asRoadAxis(value.axis, `events[${index}].axis`, scenarioPath),
        waiting: asBoolean(value.waiting, `events[${index}].waiting`, scenarioPath)
      };
    case 'pedestrian':
      return { atSeconds, kind };
    case 'sensorFailure':
      return {
        atSeconds,
        kind,
        axis: asRoadAxis(value.axis, `events[${index}].axis`, scenarioPath)
      };
    case 'transitionFailure':
      return {
        atSeconds,
        kind,
        axis: asRoadAxis(value.axis, `events[${index}].axis`, scenarioPath)
      };
    case 'lightFailure':
      return {
        atSeconds,
        kind,
        failureKind: asLightFailureKind(
          value.failureKind,
          `events[${index}].failureKind`,
          scenarioPath
        )
      };
    default:
      return assertNever(kind);
  }
}

function asScenarioEventKind(
  value: unknown,
  field: string,
  scenarioPath: string
): ScenarioEventKind {
  if (
    value === 'traffic' ||
    value === 'pedestrian' ||
    value === 'sensorFailure' ||
    value === 'transitionFailure' ||
    value === 'lightFailure'
  ) {
    return value;
  }
  throw new Error(
    `Scenario file ${scenarioPath} field ${field} must be one of traffic, pedestrian, sensorFailure, transitionFailure, lightFailure.`
  );
}

function asRoadAxis(value: unknown, field: string, scenarioPath: string): RoadAxis {
  if (value === 'NS' || value === 'EW') {
    return value;
  }
  throw new Error(`Scenario file ${scenarioPath} field ${field} must be NS or EW.`);
}

function asLightFailureKind(
  value: unknown,
  field: string,
  scenarioPath: string
): LightFailureKind {
  if (value === 'illuminate' || value === 'deilluminate') {
    return value;
  }
  throw new Error(
    `Scenario file ${scenarioPath} field ${field} must be illuminate or deilluminate.`
  );
}

function asBoolean(value: unknown, field: string, scenarioPath: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error(`Scenario file ${scenarioPath} field ${field} must be boolean.`);
}

function asNonEmptyString(value: unknown, field: string, scenarioPath: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  throw new Error(
    `Scenario file ${scenarioPath} field ${field} must be a non-empty string.`
  );
}

function asNonNegativeNumber(
  value: unknown,
  field: string,
  scenarioPath: string
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  throw new Error(
    `Scenario file ${scenarioPath} field ${field} must be a non-negative number.`
  );
}

function asPositiveNumber(value: unknown, field: string, scenarioPath: string): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  throw new Error(
    `Scenario file ${scenarioPath} field ${field} must be a positive number.`
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported scenario event: ${String(value)}`);
}
