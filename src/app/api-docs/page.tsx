import { getApiDocs } from '@/lib/swagger';
import SwaggerUIComponent from '@/components/swagger-ui';

export const metadata = {
  title: 'API Documentation - TrailBlazer AI',
  description: 'OpenAPI documentation for TrailBlazer AI REST API',
};

export default async function ApiDocsPage() {
  const spec = await getApiDocs();
  return <SwaggerUIComponent spec={spec as Record<string, unknown>} />;
}
