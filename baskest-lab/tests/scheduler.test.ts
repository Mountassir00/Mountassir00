import { planSchedule, reschedule, detectConflicts, type ScheduleInput } from '../src/core/scheduler/scheduler';
import { format3x3Open } from '../src/core/simulation/presets';

function input(): ScheduleInput {
  return {
    format: format3x3Open(16),
    teams: Array.from({ length: 16 }, (_, i) => ({ id: `T${i + 1}`, name: `Team ${i + 1}` })),
    courts: [1, 2, 3, 4].map((i) => ({ id: `C${i}`, name: `Terrain ${i}`, availability: [{ from: 0, to: 600 }], showCourt: i === 1 })),
    officials: Array.from({ length: 8 }, (_, i) => ({ id: `R${i + 1}`, name: `Arbitre ${i + 1}`, role: 'arbitre' as const, availability: [{ from: 0, to: 600 }] })),
    blocks: [{ id: 'open', label: 'Ouverture', kind: 'ceremonie', start: 0, duration: 20, courtId: 'C1' }],
    slotMinutes: 15,
    minRestMinutes: 15,
    officialsPerMatch: 1,
    dayEnd: 480,
    maxWaitMinutes: 90,
    opening: '10:00',
  };
}

describe('moteur de programmation', () => {
  it('programme tout le tournoi sans conflit', () => {
    const s = planSchedule(input());
    expect(s.matches.filter((m) => m.start === undefined)).toHaveLength(0);
    expect(s.conflicts).toHaveLength(0);
    expect(s.stats.minRest).toBeGreaterThanOrEqual(15);
  });
  it('respecte les blocs fixes (cérémonie) sur le terrain principal', () => {
    const s = planSchedule(input());
    expect(s.matches.some((m) => m.courtId === 'C1' && m.start! < 20)).toBe(false);
  });
  it('détecte un conflit introduit à la main', () => {
    const inp = input();
    const s = planSchedule(inp);
    const [a, b] = s.matches.filter((m) => m.home === 'T1');
    b.start = a.start;
    expect(detectConflicts(s, inp).some((c) => c.kind === 'equipe_double')).toBe(true);
  });
  it('replanifie après indisponibilité d’un terrain sans toucher aux matchs joués', () => {
    const inp = input();
    const s = planSchedule(inp);
    const r = reschedule(s, inp, { kind: 'terrain_indisponible', courtId: 'C2', from: 60, to: 180 }, 60);
    expect(r.requiresApproval).toBe(true);
    expect(r.schedule.matches.some((m) => m.courtId === 'C2' && m.start! >= 60 && m.start! < 180)).toBe(false);
    const playedBefore = s.matches.filter((m) => m.start! < 60).map((m) => `${m.id}${m.start}`);
    const playedAfter = r.schedule.matches.filter((m) => m.start !== undefined && m.start < 60).map((m) => `${m.id}${m.start}`);
    expect(playedAfter).toEqual(expect.arrayContaining(playedBefore));
    expect(r.schedule.conflicts.filter((c) => c.severity === 'bloquant')).toHaveLength(0);
  });
  it('gère un forfait', () => {
    const inp = input();
    const r = reschedule(planSchedule(inp), inp, { kind: 'absence_equipe', teamId: 'T5' }, 30);
    expect(r.forfeits.length).toBeGreaterThan(0);
  });
});
