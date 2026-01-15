'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIComponentProps {
  spec: Record<string, unknown>;
}

export default function SwaggerUIComponent({ spec }: SwaggerUIComponentProps) {
  return (
    <div className="swagger-wrapper">
      <SwaggerUI spec={spec} />
      <style jsx global>{`
        .swagger-wrapper {
          background: white;
          min-height: 100vh;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          color: #3b5249;
        }
        .swagger-ui .scheme-container {
          background: #f7f5f0;
          padding: 15px;
        }
        .swagger-ui .opblock-tag {
          border-bottom: 1px solid #c8b89a;
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #3b5249;
          background: rgba(59, 82, 73, 0.05);
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: #3b5249;
        }
        .swagger-ui .opblock.opblock-post {
          border-color: #d97706;
          background: rgba(217, 119, 6, 0.05);
        }
        .swagger-ui .opblock.opblock-post .opblock-summary {
          border-color: #d97706;
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #dc2626;
          background: rgba(220, 38, 38, 0.05);
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary {
          border-color: #dc2626;
        }
        .swagger-ui .opblock.opblock-patch {
          border-color: #059669;
          background: rgba(5, 150, 105, 0.05);
        }
        .swagger-ui .opblock.opblock-patch .opblock-summary {
          border-color: #059669;
        }
        .swagger-ui .btn.execute {
          background-color: #3b5249;
          border-color: #3b5249;
        }
        .swagger-ui .btn.execute:hover {
          background-color: #2d3e38;
        }
      `}</style>
    </div>
  );
}
