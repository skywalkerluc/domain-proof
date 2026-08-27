import { normalizeDomain } from './domain-name';

describe('normalizeDomain', () => {
  it.each([
    ['internal tab', 'exa\tmple.com'],
    ['zero-width space', 'example\u200b.com'],
    ['soft hyphen', 'exam\u00adple.com'],
    ['leading zero-width space', '\u200bexample.com'],
    ['trailing soft hyphen', 'example.com\u00ad'],
  ])('rejects %s instead of silently removing it', (_case, domain) => {
    expect(normalizeDomain(domain)).toBeNull();
  });

  it('continues to normalize ordinary surrounding whitespace', () => {
    expect(normalizeDomain(' \nExample.COM.\t')).toBe('example.com');
  });

  it('preserves a contextually valid ZWNJ in an internationalized domain', () => {
    expect(normalizeDomain('فارسی‌زبان.com')).toBe(
      'xn--mgbac9aff9g0b08f485m.com',
    );
  });

  it.each(['a\u200cb.com', 'a\u200db.com'])(
    'leaves invalid joiner context rejection to IDNA: %s',
    (domain) => {
      expect(normalizeDomain(domain)).toBeNull();
    },
  );
});
