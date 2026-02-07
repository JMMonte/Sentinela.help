# Adding a New Data Source

## Quick Start

1. **Create collector** in `worker/src/collectors/your-source.ts`
2. **Add config** in `worker/src/config.ts`
3. **Register** in `worker/src/index.ts`
4. **Create API route** in `src/app/api/your-source/route.ts`

## Step 1: Create Collector

```typescript
// worker/src/collectors/your-source.ts
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";

type YourData = {
  id: string;
  value: number;
  // ... your fields
};

export class YourSourceCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.yourSource.name,
      redisKey: COLLECTOR_CONFIGS.yourSource.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.yourSource.ttlSeconds,
    });
  }

  protected async collect(): Promise<YourData[]> {
    const response = await fetch("https://api.example.com/data");

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to your format
    const result = data.map((item: any) => ({
      id: item.id,
      value: item.value,
    }));

    this.logger.info(`Collected ${result.length} items`);
    return result;
  }
}
```

## Step 2: Add Config

```typescript
// worker/src/config.ts

// Add to envSchema:
DISABLE_YOUR_SOURCE: z.coerce.boolean().default(false),

// Add to COLLECTOR_CONFIGS:
yourSource: {
  name: "your-source",
  redisKey: "kaos:your-source:data",
  ttlSeconds: 300,      // Cache for 5 min
  intervalMs: 60_000,   // Fetch every 1 min
},
```

## Step 3: Register Collector

```typescript
// worker/src/index.ts

import { YourSourceCollector } from "./collectors/your-source.js";

// In main():
if (!config.DISABLE_YOUR_SOURCE) {
  scheduler.register(new YourSourceCollector(), COLLECTOR_CONFIGS.yourSource.intervalMs);
}
```

## Step 4: Create API Route

```typescript
// src/app/api/your-source/route.ts
import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

type YourData = {
  id: string;
  value: number;
};

export async function GET() {
  const data = await getFromRedis<YourData[]>("kaos:your-source:data");

  if (!data) {
    return NextResponse.json(
      { error: "Data unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json(data);
}
```

## Collector Types

| Type | Use Case | Base Class |
|------|----------|------------|
| Interval | Most APIs (REST, fetch every N seconds) | `BaseCollector` |
| Multi-key | Multiple Redis keys (e.g., seismic feeds) | `MultiKeyCollector` |
| WebSocket | Real-time streams (e.g., lightning) | `WebSocketCollector` |

## Tips

- **Rate limits**: Set `intervalMs` conservatively. Check API docs.
- **TTL**: Set `ttlSeconds` slightly longer than `intervalMs` to avoid gaps.
- **Errors**: Just throw - BaseCollector handles retries and status tracking.
- **Logging**: Use `this.logger.info/warn/error/debug()`.
- **Auth**: Pass config to constructor if you need API keys.

## Testing Locally

```bash
# Start local Redis
docker run -p 6379:6379 redis

# Run worker
cd worker && pnpm dev

# Check your data
redis-cli GET kaos:your-source:data
```
