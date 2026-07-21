import { keys, mouse, selectedBuild, setSelectedBuild, manualBuildAngle, setManualBuildAngle, player } from '../state';
import { snapAngleToCardinal } from '../utils';
import { StructureKind } from '../types';

export function setupInputListeners(
  canvas: HTMLCanvasElement,
  onTryBuildOrUpgrade: () => void,
  onSelectBuild: (key: StructureKind) => void,
  onRenderBuildBar: () => void,
  onToggleDebugPanel: () => void
): void {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'e') onTryBuildOrUpgrade();
    if (k === '1') onSelectBuild('wall');
    if (k === '2') onSelectBuild('spike');
    if (k === '3') onSelectBuild('cannon');
    if (k === '4') onSelectBuild('mortar');
    if (k === '5') onSelectBuild('sniper');
    if (k === '6') onSelectBuild('campfire');
    if (k === '7') onSelectBuild('shop');
    if (k === '8') onSelectBuild('factory');
    if (k === 'r' && (selectedBuild === 'wall' || selectedBuild === 'spike')) {
      const base = manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
      setManualBuildAngle((base + Math.PI / 2) % (Math.PI * 2));
    }
    if (k === 'escape') {
      if (selectedBuild) {
        setSelectedBuild(null);
        onRenderBuildBar();
      } else {
        onTryBuildOrUpgrade();
      }
    }
    if (k === 'home') {
      e.preventDefault();
      onToggleDebugPanel();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false;
  });

  let rect = canvas.getBoundingClientRect();
  const updateRect = () => { rect = canvas.getBoundingClientRect(); };
  window.addEventListener('resize', updateRect);
  window.addEventListener('scroll', updateRect, { passive: true });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  // Prevent context menu (right click image save popup, etc)
  window.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
  });

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) { // Left Click
      if (selectedBuild) {
        onTryBuildOrUpgrade();
      } else {
        mouse.down = true;
      }
    } else if (e.button === 2) { // Right Click
      if (selectedBuild) {
        setSelectedBuild(null);
        onRenderBuildBar();
      }
    }
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button === 0) { // Left Click release
      mouse.down = false;
    }
  });
}
