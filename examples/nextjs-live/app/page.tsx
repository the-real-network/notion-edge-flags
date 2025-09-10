export const dynamic = 'force-dynamic';
import { createFlagsClient, evaluate } from 'notion-edge-flags';

export default async function Page() {
  const client = createFlagsClient();
  const flags = await client.getMany([
    'newCheckoutFlow', 'maxCartItems', 'welcomeMessage', 
    'paymentConfig', 'premiumFeatureRollout', 'regionBasedPricing'
  ]);

  const percent = Number(flags.premiumFeatureRollout) || 0;
  const inCohort = evaluate.rolloutPercent({
    key: 'premiumFeatureRollout',
    percent,
    unitId: 'user-12345'
  });

  const ruleResult = evaluate.ruleSet({
    key: 'regionBasedPricing',
    value: flags.regionBasedPricing,
    context: { country: 'US', plan: 'enterprise' }
  });

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif,system-ui', maxWidth: 800, lineHeight: 1.6 }}>
      <h1>🚩 notion-edge-flags live example</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>All Flag Values</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div><strong>Checkout Flow:</strong> {JSON.stringify(flags.newCheckoutFlow)}</div>
          <div><strong>Max Cart Items:</strong> {JSON.stringify(flags.maxCartItems)}</div>
          <div><strong>Welcome Message:</strong> {JSON.stringify(flags.welcomeMessage)}</div>
          <div><strong>Payment Config:</strong> {JSON.stringify(flags.paymentConfig)}</div>
          <div><strong>Premium Rollout:</strong> {JSON.stringify(flags.premiumFeatureRollout)}%</div>
          <div><strong>Regional Pricing:</strong> {JSON.stringify(flags.regionBasedPricing)}</div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Rollout Evaluation</h2>
        <div style={{ background: '#f0f8ff', padding: 16, borderRadius: 8 }}>
          <div>Premium Features Rollout: {percent}%</div>
          <div>User ID: user-12345</div>
          <div>In Cohort: <strong>{inCohort ? 'YES' : 'NO'}</strong></div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Rule Evaluation</h2>
        <div style={{ background: '#f5fff5', padding: 16, borderRadius: 8 }}>
          <div>Context: {JSON.stringify({ country: 'US', plan: 'enterprise' })}</div>
          <div>Regional Pricing: <strong>{ruleResult ? 'ENABLED' : 'DISABLED'}</strong></div>
        </div>
      </section>

      <section>
        <h2>Raw Data</h2>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(flags, null, 2)}
        </pre>
      </section>

      <footer style={{ marginTop: 32, padding: 16, background: '#fffbf0', borderRadius: 8 }}>
        <p><strong>Test sync:</strong> Edit flags in Notion → run <code>npx notion-edge-flags sync --env development --once</code> → refresh this page</p>
        <p><strong>Emergency flip:</strong> <code>npx notion-edge-flags flip --env development --key newCheckoutFlow --value false</code></p>
      </footer>
    </main>
  );
}

