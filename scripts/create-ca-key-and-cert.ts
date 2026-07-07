/**
 * One-time CA key + cert bootstrap script.
 *
 * Creates the KMS RSA_2048 CA signing key (if KMS_CA_KEY_ARN is unset),
 * then generates a self-signed CA certificate and prints both to stdout.
 *
 * Run once per Doppler config (prd, stg):
 *   doppler run --project kakunin-project --config prd -- npx tsx scripts/create-ca-key-and-cert.ts
 *
 * Then store the output values in Doppler:
 *   doppler secrets set KMS_CA_KEY_ARN="<arn>" KAKUNIN_CA_CERT_PEM="<pem>" \
 *     --project kakunin-project --config prd
 *
 * IMPORTANT: Run this once. Rotating the CA key invalidates all existing agent certs.
 */

import { KMSClient, CreateKeyCommand, KeySpec, KeyUsageType } from '@aws-sdk/client-kms';
import { generateCaCert } from '../src/lib/certificates/ca';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const region = process.env.AWS_REGION;
  if (!region) {
    console.error('❌  AWS_REGION not set');
    process.exit(1);
  }

  let caKeyArn = process.env.KMS_CA_KEY_ARN;

  if (caKeyArn) {
    console.error(`ℹ️   KMS_CA_KEY_ARN already set: ${caKeyArn}`);
    console.error('    Skipping key creation — generating cert with existing key.');
  } else {
    console.error('Creating KMS RSA_2048 CA signing key...');
    const kms = new KMSClient({ region });
    const result = await kms.send(new CreateKeyCommand({
      KeySpec: KeySpec.RSA_2048,
      KeyUsage: KeyUsageType.SIGN_VERIFY,
      Description: 'Kakunin AI Agent CA Root Key',
      Tags: [
        { TagKey: 'kakunin:purpose', TagValue: 'ca-root' },
        { TagKey: 'kakunin:env', TagValue: process.env.DOPPLER_CONFIG ?? 'unknown' },
      ],
    }));

    caKeyArn = result.KeyMetadata?.Arn;
    if (!caKeyArn) {
      console.error('❌  KMS CreateKey did not return ARN');
      process.exit(1);
    }

    console.error(`✅  Created KMS key: ${caKeyArn}`);
    process.env.KMS_CA_KEY_ARN = caKeyArn;
  }

  console.error('Generating CA certificate...');
  const pem = await generateCaCert();
  console.error('✅  CA certificate generated.');

  // Print results as env var export lines to stdout
  console.log(`KMS_CA_KEY_ARN=${caKeyArn}`);
  console.log(`KAKUNIN_CA_CERT_PEM=${pem}`);
}

main().catch((err: unknown) => {
  console.error('Error:', err);
  process.exit(1);
});
