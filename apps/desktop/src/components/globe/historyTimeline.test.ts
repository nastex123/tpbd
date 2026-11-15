import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calendarMonthIndex, nextObservationDate, observationDates } from './historyTimeline.ts';

test('plays only dates present in the source series and keeps explicit missing months', () => {
  const points = [
    { date: '2000-03', value: null },
    { date: '2000-01', value: 1 },
    { date: '2000-03', value: null },
    { date: 'invalid', value: 2 },
  ];
  assert.deepEqual(observationDates(points), ['2000-01', '2000-03']);
});

test('calendar positions preserve a visible gap for omitted months', () => {
  assert.equal(calendarMonthIndex('2000-03') - calendarMonthIndex('2000-01'), 2);
  assert.ok(Number.isNaN(calendarMonthIndex('2000-13')));
});

test('playback advances through available observations and wraps at the end', () => {
  const dates = ['2000-01', '2000-03'];
  assert.equal(nextObservationDate('2000-01', dates), '2000-03');
  assert.equal(nextObservationDate('2000-03', dates), '2000-01');
  assert.equal(nextObservationDate('2000-02', dates), '2000-01');
  assert.equal(nextObservationDate('2000-02', []), '2000-02');
});
