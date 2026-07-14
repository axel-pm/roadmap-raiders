// Settings screen: audio toggles/volumes, abandon run. Persists via the engine.

import { h, clear } from '../dom';
import { audio } from '../../audio/engine';
import { sfx } from '../../audio/sfx';

export interface SettingsOpts {
  inRun: boolean;
  onBack: () => void;
  onAbandon: () => void;
}

export function renderSettings(root: HTMLElement, opts: SettingsOpts): void {
  clear(root);

  const toggle = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
    const btn = h('button', { class: `toggle ${get() ? 'on' : 'off'}` }, get() ? 'On' : 'Off');
    btn.addEventListener('click', () => {
      const v = !get();
      set(v);
      btn.textContent = v ? 'On' : 'Off';
      btn.classList.toggle('on', v);
      btn.classList.toggle('off', !v);
      sfx('button');
    });
    return h('div', { class: 'settings-row' }, h('span', {}, label), btn);
  };

  const slider = (label: string, get: () => number, set: (v: number) => void): HTMLElement => {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(get() * 100));
    input.className = 'settings-slider';
    input.addEventListener('input', () => set(Number(input.value) / 100));
    return h('div', { class: 'settings-row' }, h('span', {}, label), input);
  };

  root.appendChild(
    h('div', { class: 'room-screen' },
      h('h2', { class: 'room-title' }, '⚙️ Settings'),
      h('div', { class: 'settings-panel' },
        toggle('Music', () => audio.settings.musicOn, (v) => audio.setMusicOn(v)),
        slider('Music volume', () => audio.settings.musicVol, (v) => {
          audio.settings.musicVol = v;
          if (audio.settings.musicOn && audio.musicBus) audio.musicBus.gain.value = v;
          audio.save();
        }),
        toggle('Sound effects', () => audio.settings.sfxOn, (v) => audio.setSfxOn(v)),
        slider('SFX volume', () => audio.settings.sfxVol, (v) => {
          audio.settings.sfxVol = v;
          if (audio.settings.sfxOn && audio.sfxBus) audio.sfxBus.gain.value = v;
          audio.save();
        }),
      ),
      h('p', { class: 'room-sub settings-hint' }, 'Long-press any card to inspect it. Tap a status icon for details.'),
      h('div', { class: 'room-actions room-actions-col' },
        opts.inRun
          ? h('button', { class: 'btn btn-ghost settings-abandon', onTap: () => opts.onAbandon() }, '🏳️ Abandon Run')
          : null,
        h('button', { class: 'btn btn-primary', onTap: () => { sfx('button'); opts.onBack(); } }, 'Back'),
      ),
    ),
  );
}
