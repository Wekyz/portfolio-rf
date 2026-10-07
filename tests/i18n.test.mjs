/**
 * Dictionnaires de traduction. Trois clés n'existaient qu'en français : la
 * confirmation d'envoi du formulaire s'affichait en clés brutes
 * ("contact.sent") sur toute la version anglaise.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
