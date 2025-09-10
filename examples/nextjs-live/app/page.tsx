export const dynamic = 'force-dynamic';
import { createFlagsClient, evaluate } from 'notion-edge-flags';

export default async function Page() {
  const client = createFlagsClient();
  
  const checkoutEnabled = await client.isEnabled('newCheckoutFlow');
  const checkoutConfig = await client.getValue('newCheckoutFlow');
  
  const maxItems = await client.getValue<number>('maxCartItems');
  const welcomeMsg = await client.getValue<string>('welcomeMessage');
  const paymentConfig = await client.getValue('paymentConfig');
  
  const premiumFlag = await client.getFlag('premiumFeatureRollout');
  const premiumEnabled = evaluate.evaluateFlag({
    key: 'premiumFeatureRollout',
    flag: premiumFlag,
    unitId: 'user-12345'
  });

  const pricingFlag = await client.getFlag('regionBasedPricing');
  const pricingEnabled = evaluate.evaluateFlag({
    key: 'regionBasedPricing',
    flag: pricingFlag,
    context: { country: 'US', plan: 'enterprise' }
  });

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif,system-ui', maxWidth: 800, lineHeight: 1.6 }}>
      <h1>🚩 notion-edge-flags live example (New API)</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Feature Flags Status</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div><strong>New Checkout Flow:</strong> {checkoutEnabled ? '✅ ENABLED' : '❌ DISABLED'} 
            {checkoutConfig && <span> - Config: {String(JSON.stringify(checkoutConfig))}</span>}</div>
          <div><strong>Max Cart Items:</strong> {maxItems ? `${maxItems} items` : 'Default'}</div>
          <div><strong>Welcome Message:</strong> {welcomeMsg || 'Default welcome'}</div>
          <div><strong>Payment Config:</strong> {JSON.stringify(paymentConfig)}</div>
          <div><strong>Premium Features:</strong> {premiumEnabled ? '✅ ENABLED' : '❌ DISABLED'} 
            {premiumFlag && <span> ({premiumFlag.type}: {JSON.stringify(premiumFlag.value)})</span>}</div>
          <div><strong>Regional Pricing:</strong> {pricingEnabled ? '✅ ENABLED' : '❌ DISABLED'}</div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Advanced Evaluation</h2>
        <div style={{ background: '#f0f8ff', padding: 16, borderRadius: 8 }}>
          <h3>Premium Features Rollout</h3>
          <div>Flag Enabled: {premiumFlag?.enabled ? 'Yes' : 'No'}</div>
          <div>Type: {premiumFlag?.type || 'N/A'}</div>
          <div>Value: {JSON.stringify(premiumFlag?.value)}</div>
          <div>User ID: user-12345</div>
          <div>Final Result: <strong>{premiumEnabled ? 'IN COHORT' : 'NOT IN COHORT'}</strong></div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Rule-based Evaluation</h2>
        <div style={{ background: '#f5fff5', padding: 16, borderRadius: 8 }}>
          <h3>Regional Pricing</h3>
          <div>Flag Enabled: {pricingFlag?.enabled ? 'Yes' : 'No'}</div>
          <div>Type: {pricingFlag?.type || 'N/A'}</div>
          <div>Context: {JSON.stringify({ country: 'US', plan: 'enterprise' })}</div>
          <div>Final Result: <strong>{pricingEnabled ? 'PRICING RULES APPLY' : 'DEFAULT PRICING'}</strong></div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>New API Showcase</h2>
        <div style={{ background: '#fff5f5', padding: 16, borderRadius: 8 }}>
          <h3>Key Benefits:</h3>
          <ul>
            <li><strong>Universal Toggle:</strong> Every flag has an enabled/disabled state</li>
            <li><strong>Flexible Values:</strong> Optional additional configuration per flag</li>
            <li><strong>Simple API:</strong> <code>isEnabled()</code>, <code>getValue()</code>, <code>getFlag()</code></li>
            <li><strong>Smart Evaluation:</strong> Built-in support for percentages and rules</li>
            <li><strong>Emergency Control:</strong> Disable any feature instantly</li>
          </ul>
        </div>
      </section>

      <footer style={{ marginTop: 32, padding: 16, background: '#fffbf0', borderRadius: 8 }}>
        <p><strong>Test sync:</strong> Edit flags in Notion → run <code>npx notion-edge-flags sync --env development --once</code> → refresh this page</p>
        <p><strong>Emergency flip:</strong> Toggle the 'enabled' checkbox in Notion to instantly disable any feature</p>
      </footer>
    </main>
  );
}

