import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { base64ToBlob } from './useDynamicAudioBrief.ts';

test('decodes base64 string to a binary Blob with correct MIME type', async () => {
  // Simple 4-byte ASCII payload: "NASA" in base64 is "TkFTQQ=="
  const base64 = 'TkFTQQ==';
  const blob = base64ToBlob(base64, 'audio/wav');

  assert.equal(blob.type, 'audio/wav');
  assert.equal(blob.size, 4);

  const arrayBuffer = await blob.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  assert.equal(text, 'NASA');
});

test('handles empty base64 payload cleanly', () => {
  const blob = base64ToBlob('', 'audio/wav');
  assert.equal(blob.type, 'audio/wav');
  assert.equal(blob.size, 0);
});
