import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type CameraShotId =
  | "SYSTEM_TO_ORGANIZATION"
  | "ORGANIZATION_TO_PERSON"
  | "PERSON_TO_TIMESLICE"
  | "TIMESLICE_TO_IMPACT";

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

interface ActiveShot {
  id: CameraShotId;
  rig: CameraRig;
  start: CameraPose;
  end: CameraPose;
  durationSeconds: number;
  elapsedSeconds: number;
  fovOvershoot: number;
  resolve: () => void;
}

export class IovCameraDirector {
  private activeShot: ActiveShot | null = null;
  private readonly levelPoses = new Map<string, CameraPose>();
  private readonly tempPosition = new THREE.Vector3();
  private readonly tempTarget = new THREE.Vector3();

  get isPlaying() {
    return this.activeShot !== null;
  }

  captureLevelPose(level: string, rig: CameraRig) {
    this.levelPoses.set(level, this.captureCurrentPose(rig));
  }

  getCapturedLevelPose(level: string) {
    const pose = this.levelPoses.get(level);
    if (!pose) return null;
    return {
      position: pose.position.clone(),
      target: pose.target.clone(),
      fov: pose.fov,
    };
  }

  applyPose(rig: CameraRig, pose: CameraPose) {
    rig.camera.position.copy(pose.position);
    rig.controls.target.copy(pose.target);
    rig.camera.fov = pose.fov;
    rig.camera.updateProjectionMatrix();
    rig.controls.update();
  }

  cancelShot() {
    if (!this.activeShot) return;
    const done = this.activeShot.resolve;
    this.activeShot = null;
    done();
  }

  playShot(args: {
    id: CameraShotId;
    rig: CameraRig;
    endPose: CameraPose;
    durationMs: number;
    fovOvershoot?: number;
  }) {
    this.cancelShot();
    const start = this.captureCurrentPose(args.rig);
    const end = {
      position: args.endPose.position.clone(),
      target: args.endPose.target.clone(),
      fov: args.endPose.fov,
    };

    return new Promise<void>((resolve) => {
      this.activeShot = {
        id: args.id,
        rig: args.rig,
        start,
        end,
        durationSeconds: Math.max(0.12, args.durationMs / 1000),
        elapsedSeconds: 0,
        fovOvershoot: args.fovOvershoot ?? 0,
        resolve,
      };
    });
  }

  update(deltaSeconds: number) {
    if (!this.activeShot) return;

    const shot = this.activeShot;
    shot.elapsedSeconds += deltaSeconds;
    const rawT = Math.min(1, shot.elapsedSeconds / shot.durationSeconds);
    const t = easeInOutCubic(rawT);

    this.tempPosition.lerpVectors(shot.start.position, shot.end.position, t);
    this.tempTarget.lerpVectors(shot.start.target, shot.end.target, t);
    shot.rig.camera.position.copy(this.tempPosition);
    shot.rig.controls.target.copy(this.tempTarget);
    shot.rig.camera.fov = this.computeShotFov(shot, t);
    shot.rig.camera.updateProjectionMatrix();
    shot.rig.controls.update();

    if (rawT >= 1) {
      const done = shot.resolve;
      this.activeShot = null;
      done();
    }
  }

  private captureCurrentPose(rig: CameraRig): CameraPose {
    return {
      position: rig.camera.position.clone(),
      target: rig.controls.target.clone(),
      fov: rig.camera.fov,
    };
  }

  private computeShotFov(shot: ActiveShot, t: number) {
    if (shot.fovOvershoot <= 0) {
      return THREE.MathUtils.lerp(shot.start.fov, shot.end.fov, t);
    }

    const pivot = 0.82;
    const overshootFov = shot.end.fov - shot.fovOvershoot;
    if (t <= pivot) {
      const localT = t / pivot;
      return THREE.MathUtils.lerp(shot.start.fov, overshootFov, localT);
    }
    const localT = (t - pivot) / Math.max(0.0001, 1 - pivot);
    return THREE.MathUtils.lerp(overshootFov, shot.end.fov, localT);
  }
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
