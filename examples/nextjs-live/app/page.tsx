export const dynamic = 'force-dynamic';
import { createFlagsClient, evaluate } from 'notion-edge-flags';

export default async function Page() {
  const client = createFlagsClient();
  const flags = await client.getMany([
    'checkoutRedesign', 'testNumber', 'testString',
    'testJSON', 'testPercent', 'testRules'
  ]);

  const percent = Number(flags.testPercent) || 0;
  const inCohort = evaluate.rolloutPercent({
    key: 'testPercent',
    percent,
    unitId: 'demo-user-123'
  });

  const ruleResult = evaluate.ruleSet({
    key: 'testRules',
    value: flags.testRules,
    context: { country: 'PL', plan: 'premium' }
  });

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif,system-ui', maxWidth: 800, lineHeight: 1.6 }}>
      <h1>🚩 notion-edge-flags live example</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>All Flag Values</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div><strong>Boolean:</strong> {JSON.stringify(flags.checkoutRedesign)}</div>
          <div><strong>Number:</strong> {JSON.stringify(flags.testNumber)}</div>
          <div><strong>String:</strong> {JSON.stringify(flags.testString)}</div>
          <div><strong>JSON:</strong> {JSON.stringify(flags.testJSON)}</div>
          <div><strong>Percent:</strong> {JSON.stringify(flags.testPercent)}</div>
          <div><strong>Rules:</strong> {JSON.stringify(flags.testRules)}</div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Rollout Evaluation</h2>
        <div style={{ background: '#f0f8ff', padding: 16, borderRadius: 8 }}>
          <div>Percent: {percent}%</div>
          <div>User ID: demo-user-123</div>
          <div>In Cohort: <strong>{inCohort ? 'YES' : 'NO'}</strong></div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Rule Evaluation</h2>
        <div style={{ background: '#f5fff5', padding: 16, borderRadius: 8 }}>
          <div>Context: {JSON.stringify({ country: 'PL', plan: 'premium' })}</div>
          <div>Result: <strong>{ruleResult ? 'ENABLED' : 'DISABLED'}</strong></div>
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
        <p><strong>Emergency flip:</strong> <code>npx notion-edge-flags flip --env development --key checkoutRedesign --value false</code></p>
      </footer>
    </main>
  );
}

