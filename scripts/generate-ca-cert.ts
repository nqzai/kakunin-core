/**
 * One-time CA certificate generation script.
 *
 * Generates a self-signed CA certificate using KMS_CA_KEY_ARN and prints
 * the PEM to stdout. Store the output in Doppler as KAKUNIN_CA_CERT_PEM.
 *
 * Run once per environment (production, staging):
 *   AWS_REGION=eu-west-1 \
 *   AWS_ACCESS_KEY_ID=... \
 *   AWS_SECRET_ACCESS_KEY=... \
 *   KMS_CA_KEY_ARN=arn:aws:kms:eu-west-1:... \
 *   npx tsx scripts/generate-ca-cert.ts
 *
 * Then:
 *   doppler secrets set KAKUNIN_CA_CERT_PEM="$(npx tsx scripts/generate-ca-cert.ts)"
 *
 * IMPORTANT: Run this once. Rotating the CA cert invalidates all existing agent certs.
 */

import { generateCaCert } from '../src/lib/certificates/ca';

async function main() {
  console.error('Generating Kakunin CA certificate via KMS_CA_KEY_ARN...');
  console.error(`KMS key: ${process.env.KMS_CA_KEY_ARN ?? '(not set)'}`);
  console.error(`Region:  ${process.env.AWS_REGION ?? '(not set)'}`);
  console.error('');

  const pem = await generateCaCert();

  // Print PEM to stdout — pipe to Doppler or save to file
  process.stdout.write(pem);

  console.error('');
  console.error('Done. Store the PEM above in Doppler:');
  console.error('  doppler secrets set KAKUNIN_CA_CERT_PEM="$(npx tsx scripts/generate-ca-cert.ts)"');
}

main().catch((err: unknown) => {
  console.error('Error:', err);
  process.exit(1);
});
