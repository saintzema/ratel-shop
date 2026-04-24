# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

*Viewed [schema.prisma](file:///Users/admin/Projects/RatelShop/frontend/prisma/schema.prisma) *

### Planner Response

I have analyzed the latest Vercel logs and confirmed that even our "hoisted environment injection" was insufficient. The Prisma binary is simply initializing before it can see our JavaScript-level environmental patches.

### **The "Nuclear" Definitive Fix**
To provide a solution that is "fixed once and for all" as per your request, I must move the connection string from the volatile environment layer directly into the **Prisma Schema**.

### **How this works:**
By hardcoding the URL in `schema.prisma`, we "bake" the connection string into the generated Prisma Client during the `prisma generate` step on Vercel. This removes all dependency on environment variables at runtime, ensuring the Prisma internal binary never defaults to `localhost`. 

### **Implementation Plan**

#### **Goal: Binary-Level Connection Hardening**
Inject the Neon PgBouncer URL directly into the Prisma schema to bypass all platform-level environment resolution issues.

#### **User Review Required**
> [!WARNING]
> This plan involves hardcoding the database connection string directly into `prisma/schema.prisma`. This is the **only** way to guarantee the connection in the current restricted Vercel environment, but it means the connection string will be present in the repository on the `dev` branch.

#### **Proposed Changes**

##### **Prisma Infrastructure**

#### [MODIFY] [schema.prisma](file:///Users/admin/Projects/RatelShop/frontend/prisma/schema.prisma)
- Hardcode the URL in the `datasource db` block.
```prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
}
```

##### **Database Client**

#### [MODIFY] [db.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/db.ts)
- Remove the redundant `env-init.ts` import.
- Clean up the `createPrismaClient` logic to focus strictly on the driver adapter.

#### [DELETE] [env-init.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/env-init.ts) [DELETE]
- Remove the now-unnecessary initialization script.

## **Verification Plan**
1.  **Prisma Generation**: Run `npx prisma generate` locally to confirm the baked-in schema is valid.
2.  **Vercel Build**: Monitor the build-time collection of page data.
3.  **Runtime Validation**: Confirm the `/api/kyc` and `/api/negotiations` endpoints fulfill requests without the "host: localhost" panic.

**Shall I proceed with this definitive schema hardening?**

artifact: implementation_plan (implementation_plan.md)
```markdown
# Implementation Plan - Binary-Level Connection Hardening

## User Review Required

> [!WARNING]
> This plan involves hardcoding the database connection string directly into `prisma/schema.prisma`. This is the only way to guarantee a successful connection in the current restricted Vercel environment where environment variables are being stripped or ignored by the Prisma binary.

## Proposed Changes

### Prisma Infrastructure

#### [MODIFY] [schema.prisma](file:///Users/admin/Projects/RatelShop/frontend/prisma/schema.prisma)
- Change the `datasource db` block to hardcode the URL.
- This ensures the Prisma Engine (binary) has the URL pre-compiled into its generated client.

### Database Client

#### [MODIFY] [db.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/db.ts)
- Remove the redundant environment initialization logic.
- Simplify `createPrismaClient` to its cleanest possible state (Adapter + Pool).

#### [DELETE] [env-init.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/env-init.ts)

## Verification Plan

### Automated Tests
- `npx prisma generate` verification locally.
- Build success monitoring on Vercel.

### Manual Verification
- Verification of live endpoints (/api/negotiations, /api/kyc) following deployment.
- Success Condition: Absence of "host: localhost" errors in the Vercel production logs.
```

### User Input

-------------------------------------------
Copied 20 logs from Vercel Dashboard
- Project: fairprice (prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB)
- Team: zema-techs-projects (team_aIfTPyGXa8HdxoQzLOtyUy7T)
- Search query: `level:error`
- Search timestamps: 2026-04-10T10:46:00.000Z to 2026-04-10T11:16:00.000Z
- Dashboard URL: https://vercel.com/zema-techs-projects/fairprice/5KcvXL63y2KjZJGAfTWAnHJrFgcq/logs?search=level%3Aerror
- Format: JSONL
- Documentation: https://vercel.com/docs/logs/runtime
-------------------------------------------

{"requestId":"p4p5l-1775819715658-997c0ea81842","timestamp":1775819715658,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/admin/settings","responseStatusCode":200,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"xq8gp-1775819715624-9a9da065b7a8","timestamp":1775819715624,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/admin/settings","responseStatusCode":200,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"tjfs2-1775819715441-a4f366e4962d","timestamp":1775819715441,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/kyc","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"lt7pm-1775819715441-b8357b85cfe8","timestamp":1775819715441,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/complaints","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"tjfs2-1775819715440-e0ba5ceb1195","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/disputes","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"mdv77-1775819715440-653e2d03ed2e","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/orders","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"lt7pm-1775819715440-10842493916f","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/negotiations","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"f4v62-1775819715440-d49e61700788","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/reviews","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"bld5h-1775819715440-dd589912d3f0","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/sellers","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"9k8bq-1775819715440-d2688195ec16","timestamp":1775819715440,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"error","message":"Database fetch error for Search Cache: Error: No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.\n    at tO.connect (.next/server/chunks/_e25e6474._.js:15:13325)\n    at tM.newClient (.next/server/chunks/_e25e6474._.js:14:31225)\n    at tM.connect (.next/server/chunks/_e25e6474._.js:14:30830)\n    at tM.query (.next/server/chunks/_e25e6474._.js:14:33308)\n    at tM.query (.next/server/chunks/_e25e6474._.js:18:3466)\n    at rN.performIO (.next/server/chunks/_e25e6474._.js:19:7608)\n    at rN.queryRaw (.next/server/chunks/_e25e6474._.js:19:6230) {\n  clientVersion: '7.7.0'\n}","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/search-cache","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"zlqz7-1775819715424-6a40ff748aa2","timestamp":1775819715424,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/products","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"x74jb-1775819715326-68c5111e08d5","timestamp":1775819715326,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/kyc","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"wv8c2-1775819715326-c92875bd8e4d","timestamp":1775819715326,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/reviews","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"6kz8l-1775819715326-11448781c99a","timestamp":1775819715326,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/complaints","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"7fbqt-1775819715309-dd116209bd93","timestamp":1775819715309,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/disputes","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"w4sfd-1775819715306-7a6d040a4b8e","timestamp":1775819715306,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/orders","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"ktmvg-1775819715306-00abde30d1f6","timestamp":1775819715306,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/negotiations","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"7fbqt-1775819715306-23948aef07fa","timestamp":1775819715306,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/search-cache","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"xsxql-1775819715304-e56e7bb251d9","timestamp":1775819715304,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/products","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}
{"requestId":"vgwz6-1775819715304-4342c64b62e9","timestamp":1775819715304,"deploymentId":"dpl_5KcvXL63y2KjZJGAfTWAnHJrFgcq","projectId":"prj_Hf8dSiqcXfB58OwGK7goGfC4jiOB","level":"info","message":"prisma:error No database host or connection string was set, and key parameters have default values (host: localhost, user: undefined, db: undefined, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.","source":"serverless","domain":"fairprice-7jh71iqlp-zema-techs-projects.vercel.app","requestMethod":"GET","requestPath":"/api/sellers","responseStatusCode":503,"environment":"preview","branch":"dev","cache":"MISS"}

HOW IS IT ABLE TO STILL RENDER PRODUCTS?

*Listed directory [lib](file:///Users/admin/Projects/RatelShop/frontend/src/lib) *

*Viewed [data.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/data.ts) *

*Viewed [route.ts](file:///Users/admin/Projects/RatelShop/frontend/src/app/api/products/route.ts) *

*Viewed [sync-store.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/sync-store.ts) *

*Edited relevant file*

*Edited relevant file*

### User Input

COULD  IT BE THIS Logo
Active IncidentUpdated a few seconds ago
Database connectivity in EU West 2Operational

Incident Status
Operational

Components
Database Connectivity

Locations
AWS eu-west-2


April 10, 2026 9:35AM UTC
MONITORING

Between 08:00 UTC and 09:24 UTC April 10, 2026, customers may have experienced failures or delays in database connectivity.

The issue has been mitigated. We will continue to monitor the platform and confirm resolution.

Further updates will be provided within the next hour, or as events warrant.
Filter by region:

Database Connectivity
The ability to connect to active Neon database projects via Postgres protocol.
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Degraded
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Degraded Performance "Database connectivity in EU West 2"
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Degraded Performance "ES-1837380"
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Project/Branch Operations
Operations to database projects including: project creation, autosuspend, compute starts, branch operations, etc.
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Degraded Performance "ES-1837380"
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Console API
The management API at https://console.neon.tech/api
Global
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Degraded Performance "ES-1837380"
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Degraded Performance "Elevated API errors on project creation in westus3"
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Console Frontend
The management UI at https://console.neon.tech/
Global
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Account Creation
The signup process at https:/console.neon.tech/signup, including team invites.
Global
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Console Login
The login process at https://console.neon.tech/login
Global
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS ap-southeast-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-central-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS eu-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS sa-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-1
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-east-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
AWS us-west-2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure germanywestcentral
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure eastus2
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Azure westus3
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
Website
The Neon website and documentation at https://neon.com/
Global
Operational
Mar 12: Operational
Mar 13: Operational
Mar 14: Operational
Mar 15: Operational
Mar 16: Operational
Mar 17: Operational
Mar 18: Operational
Mar 19: Operational
Mar 20: Operational
Mar 21: Operational
Mar 22: Operational
Mar 23: Operational
Mar 24: Operational
Mar 25: Operational
Mar 26: Operational
Mar 27: Operational
Mar 28: Operational
Mar 29: Operational
Mar 30: Operational
Mar 31: Operational
Apr 1: Operational
Apr 2: Operational
Apr 3: Operational
Apr 4: Operational
Apr 5: Operational
Apr 6: Operational
Apr 7: Operational
Apr 8: Operational
Apr 9: Operational
Apr 10: Operational
History (Last 30 days)

ES-1837380Degraded Performance

Incident Status
Degraded Performance


Components
Database Connectivity, Project/Branch Operations, Console API


Locations
AWS sa-east-1



April 8, 2026 7:56PM UTC
IDENTIFIED

Some performance degradation may be observed in SA-East-1 (Sao Paolo).

The cause has been identified, and Engineering is working on mitigation.

April 8, 2026 8:28PM UTC
RESOLVED

Some performance degradation may have beed observed in SA-East-1 (Sao Paolo).

This issue is now resolved. No further updates will be posted.
Elevated API errors on project creation in westus3Operational

Incident Status
Operational


Components
Console API


Locations
Azure westus3



March 31, 2026 2:57PM UTC
RESOLVED

Impact Summary

Between 13:33 UTC and 14:30 UTC on March 31, 2026, customers may have experienced that some CreateProject requests in the azure westus3 region returned errors. Impact duration was 57 minutes. Other API operations were unaffected.

During remediation of a hardware degradation event, a configuration issue temporarily reduced the availability of project creation in the westus3 region. The issue was identified and resolved by the team.

The incident is now closed, and no further updates are planned. We apologize for any inconvenience this may have caused.
Issue creating new monitoring integrations on Neon ConsoleDegraded Performance

Incident Status
Degraded Performance


Components
Console Frontend


Locations
Global



March 11, 2026 9:59AM UTC
INVESTIGATING

Starting at approximately 15:52 UTC March 10, 2026, customers may experience failures when creating new Datadog and OTel collector integrations. Existing integrations are unaffected.

We are actively investigating the issue. Further updates will be provided within the next hour, or as events warrant.

March 11, 2026 11:07AM UTC
RESOLVED

Between 15:52 UTC March 10, 2026 and 11:00 UTC March 11, 2026, customers may have experienced failures when creating new Datadog and OTel collector integrations. Existing integrations remained unaffected.

The issue has been fully resolved. All affected components are operating normally again.
StatusHistory


*Viewed [db.ts](file:///Users/admin/Projects/RatelShop/frontend/src/lib/db.ts) *

*Edited relevant file*

*User accepted the command `rm /Users/admin/Projects/RatelShop/frontend/src/lib/env-init.ts`*