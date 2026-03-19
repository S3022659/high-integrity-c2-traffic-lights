import type {
  AlertRecord,
  ControllerSnapshot,
  RoadAxis,
  SignalAspect,
  TrafficSensors
} from './types';

type Phase =
  | 'NS_GREEN'
  | 'NS_AMBER'
  | 'ALL_RED_BEFORE_EW'
  | 'EW_RED_AMBER'
  | 'EW_GREEN'
  | 'EW_AMBER'
  | 'ALL_RED_BEFORE_NS'
  | 'NS_RED_AMBER'
  | 'EMERGENCY_OFF';

const INTERMEDIATE_SECONDS = 1.5;
const GREEN_LIMIT_SECONDS = 30;
const PEDESTRIAN_HOLD_SECONDS = 15;
const EPSILON = 1e-9;

export class TrafficController {
  private phase: Phase = 'NS_GREEN';
  private phaseElapsedSeconds = 0;
  private nowSeconds = 0;

  private nsSignal: SignalAspect = 'GREEN';
  private ewSignal: SignalAspect = 'RED';

  private sensors: TrafficSensors = { NS: false, EW: false };

  private pedestrianWaiting = false;
  private pedestrianCrossingRemainingSeconds = 0;

  private sensorFailures = new Set<RoadAxis>();
  private failNextTransitionForAxis: RoadAxis | null = null;
  private failNextIllumination = false;
  private failNextDeillumination = false;

  private readonly alerts: AlertRecord[] = [];
  private emergencyOff = false;

  public setTrafficDetected(axis: RoadAxis, waiting: boolean): void {
    if (this.sensorFailures.has(axis)) {
      return;
    }
    this.sensors[axis] = waiting;
  }

  public requestPedestrianCrossing(): void {
    this.pedestrianWaiting = true;
  }

  public injectSensorFailure(axis: RoadAxis): void {
    if (this.sensorFailures.has(axis)) {
      return;
    }
    this.sensorFailures.add(axis);
    this.pushAlert(
      'SENSOR_FAILURE',
      `Traffic sensor failure on ${axis}; green phases revert to ${GREEN_LIMIT_SECONDS}s.`
    );
  }

  public injectTransitionFailure(axis: RoadAxis): void {
    this.failNextTransitionForAxis = axis;
  }

  public injectLightFailure(kind: 'illuminate' | 'deilluminate'): void {
    if (kind === 'illuminate') {
      this.failNextIllumination = true;
      return;
    }
    this.failNextDeillumination = true;
  }

  public step(deltaSeconds: number): ControllerSnapshot {
    if (deltaSeconds < 0) {
      throw new Error('step deltaSeconds must be >= 0');
    }

    let remaining = deltaSeconds;

    while (remaining > EPSILON && !this.emergencyOff) {
      const duration = this.getCurrentPhaseDurationSeconds();

      if (duration <= EPSILON) {
        this.transitionToNextPhase();
        continue;
      }

      if (duration === Number.POSITIVE_INFINITY) {
        this.phaseElapsedSeconds += remaining;
        this.nowSeconds += remaining;
        remaining = 0;
        continue;
      }

      const untilTransition = Math.max(duration - this.phaseElapsedSeconds, 0);
      const consumed = Math.min(untilTransition, remaining);

      this.phaseElapsedSeconds += consumed;
      this.nowSeconds += consumed;
      remaining -= consumed;

      if (this.phaseElapsedSeconds + EPSILON >= duration) {
        this.transitionToNextPhase();
      }
    }

    return this.getSnapshot();
  }

  public getSnapshot(): ControllerSnapshot {
    const crossingActive = this.isPedestrianHoldActive();

    return {
      timeSeconds: this.nowSeconds,
      phase: this.phase,
      lanes: {
        northbound: this.nsSignal,
        southbound: this.nsSignal,
        eastbound: this.ewSignal,
        westbound: this.ewSignal
      },
      pedestrian: {
        waiting: this.pedestrianWaiting,
        crossingActive,
        crossingRemainingSeconds: crossingActive
          ? Math.max(
              0,
              this.pedestrianCrossingRemainingSeconds - this.phaseElapsedSeconds
            )
          : 0,
        audibleAlertActive: crossingActive,
        crossingLightActive: crossingActive
      },
      alerts: [...this.alerts],
      emergencyOff: this.emergencyOff
    };
  }

  private getCurrentPhaseDurationSeconds(): number {
    switch (this.phase) {
      case 'NS_GREEN': {
        if (this.anySensorFailed()) {
          return GREEN_LIMIT_SECONDS;
        }
        return this.sensors.EW ? GREEN_LIMIT_SECONDS : Number.POSITIVE_INFINITY;
      }
      case 'EW_GREEN': {
        if (this.anySensorFailed()) {
          return GREEN_LIMIT_SECONDS;
        }
        return this.sensors.NS ? GREEN_LIMIT_SECONDS : Number.POSITIVE_INFINITY;
      }
      case 'NS_AMBER':
      case 'EW_AMBER':
      case 'NS_RED_AMBER':
      case 'EW_RED_AMBER':
        return INTERMEDIATE_SECONDS;
      case 'ALL_RED_BEFORE_EW':
      case 'ALL_RED_BEFORE_NS':
        return this.pedestrianCrossingRemainingSeconds;
      case 'EMERGENCY_OFF':
        return Number.POSITIVE_INFINITY;
      default:
        return Number.POSITIVE_INFINITY;
    }
  }

  private transitionToNextPhase(): void {
    if (this.emergencyOff) {
      return;
    }

    const next = this.getNextPhase();

    if (
      (this.failNextTransitionForAxis === 'NS' && next.startsWith('NS')) ||
      (this.failNextTransitionForAxis === 'EW' && next.startsWith('EW'))
    ) {
      this.failNextTransitionForAxis = null;
      this.shutdownToEmergency(
        'TRANSITION_FAILURE',
        `Installation failed to progress while transitioning into ${next}.`
      );
      return;
    }

    this.phase = next;
    this.phaseElapsedSeconds = 0;

    if (this.phase === 'ALL_RED_BEFORE_EW' || this.phase === 'ALL_RED_BEFORE_NS') {
      if (this.pedestrianWaiting) {
        this.pedestrianCrossingRemainingSeconds = PEDESTRIAN_HOLD_SECONDS;
        this.pedestrianWaiting = false;
      } else {
        this.pedestrianCrossingRemainingSeconds = 0;
      }
    }

    const nextSignals = this.phaseToSignals(this.phase);
    this.applySignals(nextSignals.ns, nextSignals.ew);
  }

  private getNextPhase(): Phase {
    switch (this.phase) {
      case 'NS_GREEN':
        return 'NS_AMBER';
      case 'NS_AMBER':
        return 'ALL_RED_BEFORE_EW';
      case 'ALL_RED_BEFORE_EW':
        return 'EW_RED_AMBER';
      case 'EW_RED_AMBER':
        return 'EW_GREEN';
      case 'EW_GREEN':
        return 'EW_AMBER';
      case 'EW_AMBER':
        return 'ALL_RED_BEFORE_NS';
      case 'ALL_RED_BEFORE_NS':
        return 'NS_RED_AMBER';
      case 'NS_RED_AMBER':
        return 'NS_GREEN';
      case 'EMERGENCY_OFF':
      default:
        return 'EMERGENCY_OFF';
    }
  }

  private phaseToSignals(phase: Phase): { ns: SignalAspect; ew: SignalAspect } {
    switch (phase) {
      case 'NS_GREEN':
        return { ns: 'GREEN', ew: 'RED' };
      case 'NS_AMBER':
        return { ns: 'AMBER', ew: 'RED' };
      case 'ALL_RED_BEFORE_EW':
      case 'ALL_RED_BEFORE_NS':
        return { ns: 'RED', ew: 'RED' };
      case 'EW_RED_AMBER':
        return { ns: 'RED', ew: 'RED_AMBER' };
      case 'EW_GREEN':
        return { ns: 'RED', ew: 'GREEN' };
      case 'EW_AMBER':
        return { ns: 'RED', ew: 'AMBER' };
      case 'NS_RED_AMBER':
        return { ns: 'RED_AMBER', ew: 'RED' };
      case 'EMERGENCY_OFF':
      default:
        return { ns: 'OFF', ew: 'OFF' };
    }
  }

  private applySignals(ns: SignalAspect, ew: SignalAspect): void {
    if (this.failNextIllumination) {
      this.failNextIllumination = false;
      this.shutdownToEmergency(
        'LIGHT_ILLUMINATE_FAILURE',
        'A light failed to illuminate as expected.'
      );
      return;
    }

    if (this.failNextDeillumination) {
      this.failNextDeillumination = false;
      this.shutdownToEmergency(
        'LIGHT_DEILLUMINATE_FAILURE',
        'A light failed to de-illuminate as expected.'
      );
      return;
    }

    const nsAllowsTraffic = ns === 'GREEN';
    const ewAllowsTraffic = ew === 'GREEN';

    if (nsAllowsTraffic && ewAllowsTraffic) {
      this.shutdownToEmergency(
        'SAFETY_CONFLICT',
        'Intersecting lanes received pass signals simultaneously.'
      );
      return;
    }

    const crossingActive = this.isPedestrianHoldActive();
    if (crossingActive && (nsAllowsTraffic || ewAllowsTraffic)) {
      this.shutdownToEmergency(
        'SAFETY_CONFLICT',
        'Traffic pass signal was active during pedestrian crossing.'
      );
      return;
    }

    this.nsSignal = ns;
    this.ewSignal = ew;
  }

  private anySensorFailed(): boolean {
    return this.sensorFailures.size > 0;
  }

  private isAllRedPhase(): boolean {
    return this.phase === 'ALL_RED_BEFORE_EW' || this.phase === 'ALL_RED_BEFORE_NS';
  }

  private isPedestrianHoldActive(): boolean {
    return (
      this.isAllRedPhase() &&
      this.pedestrianCrossingRemainingSeconds > EPSILON &&
      this.phaseElapsedSeconds + EPSILON < this.pedestrianCrossingRemainingSeconds
    );
  }

  private shutdownToEmergency(code: AlertRecord['code'], message: string): void {
    this.pushAlert(code, message);
    this.pushAlert(
      'EMERGENCY_OFF',
      'All installations switched off for fail-safe state.'
    );

    this.phase = 'EMERGENCY_OFF';
    this.phaseElapsedSeconds = 0;
    this.nsSignal = 'OFF';
    this.ewSignal = 'OFF';
    this.pedestrianCrossingRemainingSeconds = 0;
    this.emergencyOff = true;
  }

  private pushAlert(code: AlertRecord['code'], message: string): void {
    this.alerts.push({
      timeSeconds: this.nowSeconds,
      code,
      message
    });
  }
}
