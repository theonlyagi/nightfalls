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
    if (k === '3') onSelectBuild('turret');
    if (k === '4') onSelectBuild('campfire');
    if (k === '5') onSelectBuild('shop');
    if (k === 'r' && (selectedBuild === 'wall' || selectedBuild === 'spike')) {
      const base = manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
      setManualBuildAngle((base + Math.PI / 2) % (Math.PI * 2));
    }
    if (k === 'escape' && selectedBuild) {
      setSelectedBuild(null);
      onRenderBuildBar();
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

  canvas.addEventListener('mousedown', () => {
    mouse.down = true;
  });

  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
}
