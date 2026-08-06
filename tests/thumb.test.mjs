/**
 * Tests de la résolution des miniatures (src/lib/thumb.js).
 *
 * Les caches sont injectés plutôt que lus depuis src/data/ : ces fichiers sont
 * régénérés à chaque build depuis l'API Vimeo, et des tests qui s'appuieraient
 * dessus changeraient de résultat au premier ré-upload d'une vidéo.
 *
 * Ce qui est verrouillé ici, c'est surtout la justesse des descripteurs
 * `srcset` : ils annonçaient auparavant des largeurs inventées (un `1920w`
 * figé sur toutes les images de base), le navigateur téléchargeait donc un
 * fichier plus petit que promis avant de l'étirer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveThumb, getUploadDate, getDuration } from '../src/lib/thumb.js';

const VIMEO = {
  902943514: {
    thumbBase: 'https://i.vimeocdn.com/video/1782788203-abc',
    uploadDate: '2024-01-15T07:50:19Z',
    durationSeconds: 83,
  },
  111: { thumbBase: 'https://i.vimeocdn.com/video/111-x', uploadDate: null, durationSeconds: 3725 },
  222: { thumbBase: 'https://i.vimeocdn.com/video/222-x', uploadDate: null, durationSeconds: 0 },
  333: { thumbBase: 'https://i.vimeocdn.com/video/333-x', uploadDate: null, durationSeconds: 45 },
};

// Reproduit les deux cas réels : une image déclinée en 4 largeurs, et une
// image trop petite dont les variantes n'ont pas été réellement redimensionnées.
const LOCAL = {
  '/live/live5.webp': {
    width: 1920,
    height: 1077,
    candidates: [
      { src: '/live/live5-640.webp', width: 640 },
      { src: '/live/live5-960.webp', width: 960 },
      { src: '/live/live5-1280.webp', width: 1280 },
      { src: '/live/live5.webp', width: 1920 },
    ],
  },
  '/live/live3.webp': {
    width: 800,
    height: 450,
    candidates: [
      { src: '/live/live3-640.webp', width: 640 },
      { src: '/live/live3-960.webp', width: 800 },
    ],
  },
  '/live/unique.webp': {
    width: 500,
    height: 300,
    candidates: [{ src: '/live/unique.webp', width: 500 }],
  },
};

const caches = { vimeo: VIMEO, local: LOCAL };

test('miniature Vimeo : quatre paliers, src sur le 1280', () => {
  const r = resolveThumb({ id: '902943514' }, caches);
  assert.equal(r.src, 'https://i.vimeocdn.com/video/1782788203-abc_1280?region=us');
  assert.equal(r.responsive, true);
  assert.deepEqual(
    r.srcset.split(', ').map((s) => s.split(' ')[1]),
    ['640w', '960w', '1280w', '1920w']
  );
});

test('override local : les descripteurs reprennent les largeurs mesurées', () => {
  const r = resolveThumb({ id: '902943514', thumb: '/live/live5.webp' }, caches);
  assert.equal(
    r.srcset,
    '/live/live5-640.webp 640w, /live/live5-960.webp 960w, /live/live5-1280.webp 1280w, /live/live5.webp 1920w'
  );
  // `src` = le plus grand candidat, repli des navigateurs sans srcset.
  assert.equal(r.src, '/live/live5.webp');
  assert.equal(r.responsive, true);
});

test("l'override local a la priorité sur la miniature Vimeo", () => {
  const r = resolveThumb({ id: '902943514', thumb: '/live/live5.webp' }, caches);
  assert.ok(!r.src.includes('vimeocdn'), 'la source Vimeo ne doit pas être utilisée');
});

test('une variante non redimensionnée est annoncée à sa largeur réelle', () => {
  const r = resolveThumb({ thumb: '/live/live3.webp' }, caches);
  // `-960` ne fait que 800 px de large : c'est ce qui doit être déclaré, et
  // non 960w comme le faisait l'ancienne version.
  assert.equal(r.srcset, '/live/live3-640.webp 640w, /live/live3-960.webp 800w');
  assert.ok(!r.srcset.includes('1920w'), 'aucune largeur inventée');
  assert.ok(!r.srcset.includes('960w'), 'le descripteur 960w était faux');
});

test('une seule taille disponible : pas de srcset du tout', () => {
  const r = resolveThumb({ thumb: '/live/unique.webp' }, caches);
  assert.equal(r.src, '/live/unique.webp');
  assert.equal(r.srcset, undefined);
  assert.equal(r.responsive, false);
});

test('image absente du cache : servie telle quelle, sans variantes inventées', () => {
  const r = resolveThumb({ thumb: '/live/pas-encore-buildee.webp' }, caches);
  assert.equal(r.src, '/live/pas-encore-buildee.webp');
  assert.equal(r.srcset, undefined);
  assert.equal(r.responsive, false);
});

test('un chemin sans slash initial est normalisé', () => {
  const r = resolveThumb({ thumb: 'live/live5.webp' }, caches);
  assert.equal(r.src, '/live/live5.webp');
});

test('miniature non webp : aucune variante', () => {
  const r = resolveThumb({ thumb: '/live/affiche.jpg' }, caches);
  assert.equal(r.src, '/live/affiche.jpg');
  assert.equal(r.responsive, false);
});

test('projet sans id ni thumb : rien à résoudre', () => {
  const r = resolveThumb({ title: 'PSG Football' }, caches);
  assert.equal(r.src, null);
  assert.equal(r.responsive, false);
});

test('getUploadDate rend la date connue, null sinon', () => {
  assert.equal(getUploadDate({ id: '902943514' }, VIMEO), '2024-01-15T07:50:19Z');
  assert.equal(getUploadDate({ id: '999' }, VIMEO), null);
  assert.equal(getUploadDate({ title: 'sans id' }, VIMEO), null);
});

test('getDuration formate en ISO 8601', () => {
  assert.equal(getDuration({ id: '902943514' }, VIMEO), 'PT1M23S'); // 83 s
  assert.equal(getDuration({ id: '111' }, VIMEO), 'PT1H2M5S'); // 3725 s
  assert.equal(getDuration({ id: '333' }, VIMEO), 'PT45S');
});

test('getDuration refuse une durée absente ou nulle', () => {
  assert.equal(getDuration({ id: '222' }, VIMEO), null); // 0 s
  assert.equal(getDuration({ id: '999' }, VIMEO), null); // inconnu
  assert.equal(getDuration({ title: 'sans id' }, VIMEO), null);
});
