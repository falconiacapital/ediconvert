import type { Express } from 'express';
import type { Storage } from './storage.js';

export function addDashboardRoutes(app: Express, storage: Storage): void {
  app.get('/', (req, res) => {
    const invoiceCount = storage.countDocuments({ type: 'invoice' });
    const orderCount = storage.countDocuments({ type: 'order' });
    const catalogCount = storage.countDocuments({ type: 'catalog' });
    const shipmentCount = storage.countDocuments({ type: 'shipment' });
    const acknowledgmentCount = storage.countDocuments({ type: 'acknowledgment' });
    const recentDocs = storage.listDocuments({ limit: 10 });

    res.send(`<!DOCTYPE html>
<html>
<head><title>EDIConvert Gateway</title><style>
  body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
  h1 { color: #3b82f6; } h2 { color: #94a3b8; }
  .stat { display: inline-block; padding: 16px; margin: 8px; background: #1e293b; border-radius: 8px; min-width: 120px; text-align: center; }
  .stat .count { font-size: 2em; font-weight: bold; color: #22c55e; }
  .stat .label { color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; }
</style></head>
<body>
  <h1>EDIConvert Gateway</h1>
  <h2>Document Counts</h2>
  <div>
    <div class="stat"><div class="count">${invoiceCount}</div><div class="label">Invoices</div></div>
    <div class="stat"><div class="count">${orderCount}</div><div class="label">Orders</div></div>
    <div class="stat"><div class="count">${catalogCount}</div><div class="label">Catalogs</div></div>
    <div class="stat"><div class="count">${shipmentCount}</div><div class="label">Shipments</div></div>
    <div class="stat"><div class="count">${acknowledgmentCount}</div><div class="label">Acknowledgments</div></div>
  </div>
  <h2>Recent Transactions</h2>
  <table>
    <tr><th>ID</th><th>Type</th><th>Partner</th><th>Date</th></tr>
    ${recentDocs.map(d => `<tr><td>${d.id}</td><td>${d.type}</td><td>${d.partnerId}</td><td>${d.createdAt || '-'}</td></tr>`).join('')}
  </table>
</body>
</html>`);
  });
}
