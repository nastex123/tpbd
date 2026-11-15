import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { deleteInvestigation, INVESTIGATIONS_KEY, readInvestigations, saveInvestigation } from './investigations.ts';

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (key: string, next: string) => {
      assert.equal(key, INVESTIGATIONS_KEY);
      value = next;
    },
  };
}

const input = {
  name: 'Amazon and Sahel',
  variable: 'T2M',
  location: { kind: 'region' as const, id: 'amazon' },
  comparison: { kind: 'coordinates' as const, lat: 13.5, lng: 2.1 },
  period: { start: 1990, end: 2025 },
};
const id = '12345678-1234-4123-8123-123456789abc';
const date = '2026-11-14T00:00:00.000Z';

test('saves, restores, and deletes an investigation with its source reference', () => {
  const storage = memoryStorage();
  const [saved] = saveInvestigation(storage, input, id, date);
  assert.equal(saved.source.provider, 'NASA POWER Monthly Point');
  assert.match(saved.source.reference, /^https:\/\/power\.larc\.nasa\.gov\//);
  assert.deepEqual(readInvestigations(storage), [saved]);
  assert.deepEqual(deleteInvestigation(storage, id), []);
});

test('rejects invalid coordinates and preserves prior records on failure', () => {
  const storage = memoryStorage();
  const expected = saveInvestigation(storage, input, id, date);
  assert.throws(() => saveInvestigation(storage, {
    ...input, location: { kind: 'coordinates', lat: 91, lng: 0 },
  }, id, date));
  assert.deepEqual(readInvestigations(storage), expected);
});

test('does not overwrite corrupt or incompatible saved data', () => {
  const raw = '{"unexpected":"data"}';
  const storage = memoryStorage(raw);
  assert.throws(() => readInvestigations(storage));
  assert.throws(() => saveInvestigation(storage, input, id, date));
  assert.equal(storage.getItem(), raw);
});

test('drops unrecognized fields, including credentials, before saving', () => {
  const storage = memoryStorage();
  const withSecret = { ...input, token: 'secret' };
  saveInvestigation(storage, withSecret, id, date);
  assert.ok(!storage.getItem()?.includes('secret'));
});
