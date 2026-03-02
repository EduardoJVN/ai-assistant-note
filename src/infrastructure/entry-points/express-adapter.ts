import type { Request, Response } from 'express';
import type { HttpRequest } from '@infra/entry-points/base.controller.js';

export function toExpressHandler(
  handler: (req: HttpRequest) => Promise<{ status: number; body: unknown }>,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const httpReq: HttpRequest = {
      body: req.body as unknown,
      params: req.params,
      query: req.query as Record<string, string>,
    };
    const result = await handler(httpReq);
    if (result.body === null) {
      res.status(result.status).end();
    } else {
      res.status(result.status).json(result.body);
    }
  };
}
