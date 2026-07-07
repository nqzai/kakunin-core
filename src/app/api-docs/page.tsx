import type { Metadata } from 'next';
import Link from 'next/link';
import { generateOpenApiSpec } from '@/lib/openapi/spec';
import { generateTechArticle } from '@/lib/schema/generators';

export const metadata: Metadata = {
  title: 'API Reference — Kakunin',
  description:
    'Interactive API reference for the Kakunin AI Agent KYC platform. Issue X.509 certificates, ingest behavioural events, query risk scores.',
  robots: { index: true, follow: true },
};

type OpenApiSpec = ReturnType<typeof generateOpenApiSpec>;
type PathItem = NonNullable<OpenApiSpec['paths']>[string];
type OperationMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Operation = NonNullable<PathItem>[OperationMethod];

const METHOD_STYLES: Record<OperationMethod, { bg: string; border: string; text: string }> = {
  get: { bg: 'rgba(37,99,235,0.08)', border: '#2563eb', text: '#1d4ed8' },
  post: { bg: 'rgba(22,163,74,0.08)', border: '#16a34a', text: '#166534' },
  put: { bg: 'rgba(202,138,4,0.08)', border: '#ca8a04', text: '#854d0e' },
  patch: { bg: 'rgba(168,85,247,0.08)', border: '#a855f7', text: '#7e22ce' },
  delete: { bg: 'rgba(220,38,38,0.08)', border: '#dc2626', text: '#991b1b' },
};

function toOperationCards(spec: OpenApiSpec) {
  const methods: OperationMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

  return Object.entries(spec.paths ?? {}).flatMap(([path, pathItem]) =>
    methods.flatMap((method) => {
      const operation = pathItem?.[method];
      if (!operation) {
        return [];
      }

      return [{
        id: `${method}-${path}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
        method,
        path,
        operation,
        tags: operation.tags ?? ['API'],
      }];
    }),
  );
}

function getPrimaryTag(operationTags: string[]) {
  return operationTags[0] ?? 'API';
}

function getRequestBodyTypes(operation: Operation) {
  const requestBody = operation?.requestBody;
  if (!requestBody || !('content' in requestBody)) {
    return [];
  }
  return Object.keys(requestBody.content ?? {});
}

function getResponseEntries(operation: Operation) {
  return Object.entries(operation?.responses ?? {});
}

export default function ApiDocsPage() {
  const spec = generateOpenApiSpec();
  const operations = toOperationCards(spec);
  const tagDescriptions = new Map((spec.tags ?? []).map((tag) => [tag.name, tag.description ?? '']));
  const groups = Array.from(
    operations.reduce((map, item) => {
      const tag = getPrimaryTag(item.tags);
      const current = map.get(tag) ?? [];
      current.push(item);
      map.set(tag, current);
      return map;
    }, new Map<string, typeof operations>()),
  );

  const apiDocsSchema = generateTechArticle(
    'API Reference — Kakunin',
    'https://www.kakunin.ai/api-docs',
    'Server-rendered OpenAPI 3.0 reference for the Kakunin AI Agent KYC platform. Certificate issuance, event streaming, and compliance reporting.',
    '2026-01-01T00:00:00Z',
    '2026-06-14T00:00:00Z',
    [
      { position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
      { position: 2, name: 'API Docs', item: 'https://www.kakunin.ai/api-docs' },
    ],
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(apiDocsSchema) }}
      />

      <div
        style={{
          minHeight: '100vh',
          background: '#f7f6f2',
          color: '#1c1917',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid #e7e5e4',
            padding: '14px 28px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                background: '#1a7a4a',
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              K
            </div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
              Kakunin API
            </span>
          </Link>
          <span
            style={{
              padding: '3px 9px',
              background: '#edfdf5',
              border: '1px solid #1a7a4a',
              borderRadius: '20px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#1a7a4a',
              fontWeight: 600,
            }}
          >
            v{spec.info.version}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '6px 14px',
                border: '1px solid #d6d3d1',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#44403c',
                textDecoration: 'none',
                background: '#fff',
              }}
            >
              openapi.json ↗
            </a>
            <Link
              href="/docs"
              style={{
                padding: '6px 14px',
                background: '#1a7a4a',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Docs →
            </Link>
          </div>
        </div>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px' }}>
          <section
            style={{
              display: 'grid',
              gap: '24px',
              gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.8fr)',
              alignItems: 'start',
              marginBottom: '36px',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#1a7a4a',
                  fontWeight: 700,
                }}
              >
                API Reference
              </p>
              <h1 style={{ margin: '0 0 12px', fontSize: '40px', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                {spec.info.title}
              </h1>
              <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.7, color: '#57534e', maxWidth: '68ch' }}>
                {spec.info.description}
              </p>
              <p style={{ margin: '16px 0 0', fontSize: '15px', lineHeight: 1.7, color: '#57534e', maxWidth: '68ch' }}>
                If you are evaluating Kakunin rather than jumping straight into implementation,
                start with the{' '}
                <Link href="/for-ctos" style={{ color: '#166534' }}>
                  CTO integration overview
                </Link>
                , the{' '}
                <Link href="/platform/non-human-identity" style={{ color: '#166534' }}>
                  non-human identity model
                </Link>
                , and the{' '}
                <Link href="/platform/sandbox" style={{ color: '#166534' }}>
                  live sandbox
                </Link>
                .
              </p>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #e7e5e4',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 10px 30px rgba(28,25,23,0.06)',
              }}
            >
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Quick Facts
              </p>
              <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#44403c' }}>
                <div><strong>Version:</strong> {spec.info.version}</div>
                <div><strong>Endpoints:</strong> {operations.length}</div>
                <div><strong>Base URL:</strong> {spec.servers?.[0]?.url ?? 'https://www.kakunin.ai'}</div>
                <div><strong>Auth:</strong> Bearer API key</div>
              </div>
            </div>
          </section>

          <section
            style={{
              background: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '28px',
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#57534e' }}>
              Available Groups
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {groups.map(([tag, items]) => (
                <a
                  key={tag}
                  href={`#tag-${tag.toLowerCase()}`}
                  style={{
                    display: 'inline-flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '999px',
                    background: '#f5f5f4',
                    color: '#292524',
                    textDecoration: 'none',
                    fontSize: '13px',
                  }}
                >
                  <span>{tag}</span>
                  <span style={{ color: '#78716c' }}>{items.length}</span>
                </a>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gap: '24px' }}>
            {groups.map(([tag, items]) => (
              <section key={tag} id={`tag-${tag.toLowerCase()}`} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.02em' }}>{tag}</h2>
                  {tagDescriptions.get(tag) ? (
                    <p style={{ margin: '8px 0 0', color: '#57534e', fontSize: '15px', lineHeight: 1.6 }}>
                      {tagDescriptions.get(tag)}
                    </p>
                  ) : null}
                </div>

                {items.map(({ id, method, path, operation }) => {
                  const style = METHOD_STYLES[method];
                  const requestBodyTypes = getRequestBodyTypes(operation);
                  const responseEntries = getResponseEntries(operation);

                  return (
                    <article
                      key={id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e7e5e4',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(28,25,23,0.05)',
                      }}
                    >
                      <div style={{ padding: '18px 20px', borderLeft: `6px solid ${style.border}` }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '72px',
                              padding: '6px 10px',
                              borderRadius: '999px',
                              background: style.bg,
                              color: style.text,
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {method}
                          </span>
                          <code
                            style={{
                              fontSize: '14px',
                              background: '#f5f5f4',
                              padding: '6px 10px',
                              borderRadius: '10px',
                              color: '#1c1917',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {path}
                          </code>
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: '22px', letterSpacing: '-0.02em' }}>
                          {operation.summary ?? path}
                        </h3>
                        {operation.description ? (
                          <p style={{ margin: 0, color: '#57534e', fontSize: '15px', lineHeight: 1.65 }}>
                            {operation.description}
                          </p>
                        ) : null}
                      </div>

                      <div style={{ padding: '0 20px 20px', display: 'grid', gap: '14px' }}>
                        {operation.security?.length ? (
                          <div style={{ padding: '14px 16px', background: '#fafaf9', borderRadius: '14px', border: '1px solid #e7e5e4' }}>
                            <strong style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Authentication</strong>
                            <span style={{ fontSize: '14px', color: '#57534e' }}>
                              Requires <code>Authorization: Bearer &lt;api_key&gt;</code>
                            </span>
                          </div>
                        ) : null}

                        {requestBodyTypes.length ? (
                          <div style={{ padding: '14px 16px', background: '#fafaf9', borderRadius: '14px', border: '1px solid #e7e5e4' }}>
                            <strong style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Request Body</strong>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {requestBodyTypes.map((contentType) => (
                                <code key={contentType} style={{ fontSize: '13px', color: '#44403c' }}>
                                  {contentType}
                                </code>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div style={{ padding: '14px 16px', background: '#fafaf9', borderRadius: '14px', border: '1px solid #e7e5e4' }}>
                          <strong style={{ display: 'block', marginBottom: '10px', fontSize: '13px' }}>Responses</strong>
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {responseEntries.map(([status, response]) => (
                              <div
                                key={status}
                                style={{
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'flex-start',
                                  padding: '10px 12px',
                                  background: '#fff',
                                  border: '1px solid #ece7df',
                                  borderRadius: '12px',
                                }}
                              >
                                <code style={{ minWidth: '44px', color: '#1c1917', fontSize: '13px' }}>{status}</code>
                                <span style={{ color: '#57534e', fontSize: '14px', lineHeight: 1.5 }}>
                                  {response.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
