/**
 * Dictionnaires de traduction. Trois clés n'existaient qu'en français : la
 * confirmation d'envoi du formulaire s'affichait en clés brutes
 * ("contact.sent") sur toute la version anglaise.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ui, useTranslations } from '../src/i18n/strings.js';

test('les dictionnaires anglais et français ont exactement les mêmes clés', () => {
  const en = Object.keys(ui.en);
  const fr = Object.keys(ui.fr);
  assert.deepEqual(fr.filter((k) => !en.includes(k)), [], 'clés présentes seulement en français');
  assert.deepEqual(en.filter((k) => !fr.includes(k)), [], 'clés présentes seulement en anglais');
});

test('la confirmation d’envoi existe dans les deux langues', () => {
  for (const lang of /** @type {const} */ (['en', 'fr'])) {
    const t = useTranslations(lang);
    for (const key of ['contact.sent', 'contact.sentSub', 'contact.again']) {
      assert.notEqual(t(key), key, `${key} (${lang})`);
    }
  }
});

test('aucune clé de traduction orpheline', () => {
  // Une clé est utilisée si elle apparaît en toutes lettres dans le code, ou
  // si elle relève d'un préfixe construit dynamiquement : `head.${page}.title`,
  // `cat.${p.cat}`, `project.descSuffix.${genre}`, `contactPage.${clé}` (voir
  // PRACTICAL dans data/profile.js).
  const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const files = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(astro|js|mjs|ts)$/.test(f) && !p.includes('i18n')) files.push(p);
    }
  };
  walk(join(root, 'src'));
  const code = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  const dynamiques = ['head.', 'cat.', 'project.descSuffix.', 'contactPage.'];
  const orphelines = Object.keys(ui.en).filter(
    (k) => !dynamiques.some((d) => k.startsWith(d)) && !new RegExp(`['"\`]${k.replace(/\./g, '\\.')}['"\`]`).test(code)
  );
  assert.deepEqual(orphelines, [], 'clés jamais utilisées : les supprimer des deux dictionnaires');
});
