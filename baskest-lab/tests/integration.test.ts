import { CONNECTORS, ApprovalRequiredError } from '../src/core/integration/contracts';
import type { ApprovalRequest } from '../src/core/model';

const approval = (action: ApprovalRequest['action'], status: ApprovalRequest['status'] = 'approuve'): ApprovalRequest => ({ id: 'a', action, payload: {}, requestedBy: 'x', requiredRole: 'bureau', status });

describe('connecteurs et approbations', () => {
  it('refuse une action sensible sans approbation', async () => {
    await expect(CONNECTORS.site.send({ slug: 's', title: 't', html: '' })).rejects.toBeInstanceOf(ApprovalRequiredError);
  });
  it('exige le bon type d’approbation (dépense pour la comptabilité)', async () => {
    await expect(CONNECTORS.accounting.send({ budgetId: 'b', lines: [] }, approval('publication'))).rejects.toBeInstanceOf(ApprovalRequiredError);
    await expect(CONNECTORS.accounting.send({ budgetId: 'b', lines: [] }, approval('depense'))).resolves.toHaveProperty('preview');
  });
  it('refuse une approbation en attente', async () => {
    await expect(CONNECTORS.site.send({ slug: 's', title: 't', html: '' }, approval('publication', 'en_attente'))).rejects.toBeInstanceOf(ApprovalRequiredError);
  });
  it('laisse passer les connecteurs non sensibles', async () => {
    await expect(CONNECTORS.crm.send({ partners: [] })).resolves.toHaveProperty('preview');
  });
});
