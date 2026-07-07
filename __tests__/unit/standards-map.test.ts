import { describe, it, expect } from 'vitest';
import {
  CONTROL_MAPPINGS,
  buildStandardsPromptSection,
  FRAMEWORK_LABELS,
  type StandardsFramework,
} from '@/lib/compliance/standards-map';

describe('standards-map — coverage', () => {
  it('every control maps all four frameworks', () => {
    for (const c of CONTROL_MAPPINGS) {
      expect(c.iso_27001?.length, `${c.control_id} iso_27001`).toBeGreaterThan(0);
      expect(c.nist_csf?.length, `${c.control_id} nist_csf`).toBeGreaterThan(0);
      expect(c.nist_ai_rmf?.length, `${c.control_id} nist_ai_rmf`).toBeGreaterThan(0);
      expect(c.nccoe_pillar?.length, `${c.control_id} nccoe_pillar`).toBeGreaterThan(0);
    }
  });

  it('AI RMF values use the four canonical functions only', () => {
    const fns = ['GOVERN', 'MAP', 'MEASURE', 'MANAGE'];
    for (const c of CONTROL_MAPPINGS) {
      for (const v of c.nist_ai_rmf ?? []) {
        expect(fns.some((f) => v.startsWith(f)), `${c.control_id}: "${v}"`).toBe(true);
      }
    }
  });

  it('NCCoE values use the four canonical pillars only', () => {
    const pillars = ['Identification', 'Authorization', 'Auditing', 'Non-repudiation'];
    for (const c of CONTROL_MAPPINGS) {
      for (const v of c.nccoe_pillar ?? []) {
        expect(pillars.some((p) => v.startsWith(p)), `${c.control_id}: "${v}"`).toBe(true);
      }
    }
  });
});

describe('buildStandardsPromptSection', () => {
  it('returns empty string when no frameworks requested', () => {
    expect(buildStandardsPromptSection([])).toBe('');
  });

  it('renders US frameworks (nist_ai_rmf + nccoe)', () => {
    const out = buildStandardsPromptSection(['nist_ai_rmf', 'nccoe']);
    expect(out).toContain('NIST AI RMF 1.0');
    expect(out).toContain('NIST NCCoE Agent Pillars');
    expect(out).toContain('C-A1');
    expect(out).toContain('Identification');
    expect(out).toContain('MAP —');
    // Should NOT leak unrequested frameworks
    expect(out).not.toContain('ISO 27001');
    expect(out).not.toContain('NIST CSF 2.0');
  });

  it('renders only the requested framework', () => {
    const out = buildStandardsPromptSection(['iso_27001']);
    expect(out).toContain('ISO 27001:2022');
    expect(out).not.toContain('NIST AI RMF');
    expect(out).not.toContain('NCCoE');
  });

  it('renders in stable order regardless of request order', () => {
    const a = buildStandardsPromptSection(['nccoe', 'iso_27001']);
    const b = buildStandardsPromptSection(['iso_27001', 'nccoe']);
    expect(a).toBe(b);
    // iso label appears before nccoe label in the header
    expect(a.indexOf('ISO 27001:2022')).toBeLessThan(a.indexOf('NIST NCCoE'));
  });

  it('every requested framework label appears in the header', () => {
    const all: StandardsFramework[] = ['iso_27001', 'nist_csf', 'nist_ai_rmf', 'nccoe'];
    const out = buildStandardsPromptSection(all);
    for (const f of all) expect(out).toContain(FRAMEWORK_LABELS[f]);
  });
});
