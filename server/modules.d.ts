declare module "cors" {
  import type { RequestHandler } from "express";

  type CorsOptions = {
    origin?: boolean | string | RegExp | Array<boolean | string | RegExp>;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  };

  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}

declare module "pg" {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    end(): Promise<void>;
  }
}
