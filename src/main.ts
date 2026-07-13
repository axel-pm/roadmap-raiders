import './styles/main.css';
import { Game } from './game';
import { sfx } from './audio/sfx';

const app = document.getElementById('app')!;
const game = new Game(app);
game.showTitle();

// menu button click sound (combat cards/enemies play their own SFX)
document.addEventListener('pointerdown', (ev) => {
  const t = ev.target as HTMLElement;
  if (t.closest('.btn, .map-node.available, .pile-btn, .hud-gear, .toggle')) {
    sfx('button');
  }
}, { passive: true });

// register the service worker for offline play (production build only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => { /* SW optional */ });
  });
}
