export type SignalAspect = 'RED' | 'RED_AMBER' | 'GREEN' | 'AMBER' | 'OFF';
export type RoadAxis = 'NS' | 'EW';

export interface TrafficSensors {
  NS: boolean;
  EW: boolean;
}

export interface AlertRecord {
  timeSeconds: number;
  code:
    | 'SENSOR_FAILURE'
    | 'TRANSITION_FAILURE'
    | 'LIGHT_ILLUMINATE_FAILURE'
    | 'LIGHT_DEILLUMINATE_FAILURE'
    | 'SAFETY_CONFLICT'
    | 'EMERGENCY_OFF';
  message: string;
}

export interface ControllerSnapshot {
  timeSeconds: number;
  phase: string;
  lanes: {
    northbound: SignalAspect;
    southbound: SignalAspect;
    eastbound: SignalAspect;
    westbound: SignalAspect;
  };
  pedestrian: {
    waiting: boolean;
    crossingActive: boolean;
    crossingRemainingSeconds: number;
    audibleAlertActive: boolean;
    crossingLightActive: boolean;
  };
  alerts: AlertRecord[];
  emergencyOff: boolean;
}
