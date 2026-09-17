import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Vercel rewrites nested tRPC procedure paths to this single function and
// preserves the procedure name in __trpc. Restore the path expected by the
// tRPC Express adapter while keeping all original query parameters.
app.use((req, _res, next) => {
  const procedure = req.query.__trpc;
  if (typeof procedure === "string" && procedure) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key === "__trpc") continue;
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item));
      } else if (value != null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    req.url = `/${procedure}${query ? `?${query}` : ""}`;
  }
  next();
});

app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
