/** Cloudflare Pages Function for the quote and contact forms. Logic lives in src/lib. */
import { handleLead } from '../../src/lib/lead-handler';

export const onRequest = (context: { request: Request; env: Record<string, unknown> }) =>
  handleLead(context.request, context.env);
