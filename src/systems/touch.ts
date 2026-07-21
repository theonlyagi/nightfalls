import { Vec2 } from '../types';
import { mouse, selectedBuild, setSelectedBuild, manualBuildAngle, setManualBuildAngle, player, touchMove, touchAim, setIsTouchActive, isTouchActive } from '../state';
import { byId, snapAngleToCardinal } from '../utils';
import { StructureKind } from '../types';

let leftTouchId: number | null = null;
let rightTouchId: number | null = null;

let leftCenter: Vec2 = { x: 0, y: 0 };
let rightCenter: Vec2 = { x: 0, y: 0 };

const JOYSTICK_RADIUS = 50;

export function isTouchDevice(): boolean {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

export function setupTouchListeners(
  canvas: HTMLCanvasElement,
  onTryBuildOrUpgrade: () => void,
  onSelectBuild: (key: StructureKind) => void,
  onRenderBuildBar: () => void
): void {
  const overlay = byId('touchOverlay');
  if (!overlay) return;

  // Keep touch overlay hidden by default on all devices.
  // Reveal ONLY when an actual touch event is initiated by a finger.
  overlay.classList.add('hidden');

  let touchActivated = false;
  function activateTouch(): void {
    if (touchActivated) return;
    touchActivated = true;
    overlay.classList.remove('hidden');
    setIsTouchActive(true);
  }

  // Bind touch action buttons
  const btnShop = byId('touchBtnShop');
  if (btnShop) btnShop.onclick = (e) => { e.preventDefault(); onTryBuildOrUpgrade(); };

  const btnRotate = byId('touchBtnRotate');
  if (btnRotate) btnRotate.onclick = (e) => {
    e.preventDefault();
    if (selectedBuild === 'wall' || selectedBuild === 'spike') {
      const base = manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
      setManualBuildAngle((base + Math.PI / 2) % (Math.PI * 2));
    }
  };

  const btnCancel = byId('touchBtnCancel');
  if (btnCancel) btnCancel.onclick = (e) => {
    e.preventDefault();
    if (selectedBuild) {
      setSelectedBuild(null);
      onRenderBuildBar();
    }
  };

  const leftBase = byId('stickLeftBase');
  const leftKnob = byId('stickLeftKnob');
  const rightBase = byId('stickRightBase');
  const rightKnob = byId('stickRightKnob');

  function updateKnob(knob: HTMLElement | null, dx: number, dy: number): void {
    if (!knob) return;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function handleTouchStart(e: TouchEvent): void {
    activateTouch();
    const target = e.target as HTMLElement;
    const isInteractive = target && target.closest('.touch-btn, .build-slot, .gear-btn, .upgrade-btn, button, input');
    if (!isInteractive && e.cancelable) {
      e.preventDefault();
    }
    const halfWidth = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX, y = t.clientY;

      if (target && target.closest('.touch-btn, .build-slot, .gear-btn, .upgrade-btn, button, input')) continue;

      if (x < halfWidth && leftTouchId === null) {
        leftTouchId = t.identifier;
        leftCenter = { x, y };
        if (leftBase) {
          leftBase.style.left = `${x}px`;
          leftBase.style.top = `${y}px`;
          leftBase.classList.add('active');
        }
        touchMove.x = 0; touchMove.y = 0;
        updateKnob(leftKnob, 0, 0);
      } else if (x >= halfWidth && rightTouchId === null) {
        rightTouchId = t.identifier;
        rightCenter = { x, y };
        if (rightBase) {
          rightBase.style.left = `${x}px`;
          rightBase.style.top = `${y}px`;
          rightBase.classList.add('active');
        }
        mouse.down = true;
        touchAim.x = 0; touchAim.y = 0;
        updateKnob(rightKnob, 0, 0);
      }
    }
  }

  function handleTouchMove(e: TouchEvent): void {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === leftTouchId) {
        let dx = t.clientX - leftCenter.x;
        let dy = t.clientY - leftCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > JOYSTICK_RADIUS) {
          dx = (dx / d) * JOYSTICK_RADIUS;
          dy = (dy / d) * JOYSTICK_RADIUS;
        }
        touchMove.x = dx / JOYSTICK_RADIUS;
        touchMove.y = dy / JOYSTICK_RADIUS;
        updateKnob(leftKnob, dx, dy);
      } else if (t.identifier === rightTouchId) {
        let dx = t.clientX - rightCenter.x;
        let dy = t.clientY - rightCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > JOYSTICK_RADIUS) {
          dx = (dx / d) * JOYSTICK_RADIUS;
          dy = (dy / d) * JOYSTICK_RADIUS;
        }
        if (d > 5) {
          touchAim.x = dx / (d || 1);
          touchAim.y = dy / (d || 1);
          mouse.down = true;
        }
        updateKnob(rightKnob, dx, dy);
      }
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === leftTouchId) {
        leftTouchId = null;
        touchMove.x = 0; touchMove.y = 0;
        if (leftBase) leftBase.classList.remove('active');
        updateKnob(leftKnob, 0, 0);
      } else if (t.identifier === rightTouchId) {
        rightTouchId = null;
        touchAim.x = 0; touchAim.y = 0;
        mouse.down = false;
        if (rightBase) rightBase.classList.remove('active');
        updateKnob(rightKnob, 0, 0);
      }
    }
  }

  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('touchcancel', handleTouchEnd);

  // Prevent iOS Safari gestures (pinch zoom, double tap zoom)
  const preventZoom = (e: Event) => { if (e.cancelable) e.preventDefault(); };
  window.addEventListener('gesturestart', preventZoom, { passive: false });
  window.addEventListener('gesturechange', preventZoom, { passive: false });
  window.addEventListener('gestureend', preventZoom, { passive: false });
}
