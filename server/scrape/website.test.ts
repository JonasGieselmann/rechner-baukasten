import { describe, it, expect } from 'vitest';
import { isBlockedIp, isBlockedHost, normalizeUrl } from './website.js';

describe('SSRF guard: isBlockedIp', () => {
  it('blocks loopback, private, link-local, CGNAT IPv4', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.1',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.255.255',
      '169.254.169.254', // cloud metadata
      '100.64.0.1', // Tailscale CGNAT
      '100.127.255.255',
      '0.0.0.0',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it('allows public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '100.63.255.255', '100.128.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it('blocks IPv6 loopback, ULA, link-local and IPv4-mapped private', () => {
    for (const ip of ['::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it('allows public IPv6', () => {
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });
});

describe('SSRF guard: isBlockedHost', () => {
  it('blocks metadata/loopback names and IP literals (incl. bracketed IPv6)', () => {
    for (const h of ['localhost', 'foo.local', 'svc.internal', '127.0.0.1', '[::1]', '100.64.0.5', '169.254.169.254']) {
      expect(isBlockedHost(h), h).toBe(true);
    }
  });

  it('allows normal public hostnames', () => {
    for (const h of ['example.com', 'beauty-flow.de', 'www.instagram.com']) {
      expect(isBlockedHost(h), h).toBe(false);
    }
  });
});

describe('normalizeUrl', () => {
  it('prefixes https and rejects non-http schemes', () => {
    expect(normalizeUrl('example.com')?.protocol).toBe('https:');
    expect(normalizeUrl('http://example.com')?.protocol).toBe('http:');
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
  });
});
