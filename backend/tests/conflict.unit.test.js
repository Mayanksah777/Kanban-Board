const { hasVersionConflict } = require('../src/utils/conflict');

describe('Version conflict utility', () => {
  it('returns false when versions match', () => {
    expect(hasVersionConflict(2, 2)).toBe(false);
  });

  it('returns true when versions are different', () => {
    expect(hasVersionConflict(2, 3)).toBe(true);
  });
});