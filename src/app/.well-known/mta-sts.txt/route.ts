export function GET() {
  const body = [
    'version: STSv1',
    'mode: testing',
    'mx: mailserver.purelymail.com',
    'mx: feedback-smtp.eu-west-1.amazonses.com',
    'max_age: 86400',
    '',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
