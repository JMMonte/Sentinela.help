# Adding a New Data Source

## The Easy Way: JSON Config

Just add a JSON file to `worker/src/sources/` - no code needed!

```json
{
  "name": "my-source",
  "description": "My awesome data source",
  "enabled": true,

  "fetch": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {
      "Accept": "application/json"
    }
  },

  "schedule": {
    "intervalMs": 60000,
    "ttlSeconds": 120
  },

  "redis": {
    "key": "kaos:my-source:data"
  },

  "transform": {
    "dataPath": "results",
    "fields": {
      "id": "item_id",
      "latitude": "lat",
      "longitude": "lon",
      "value": "reading"
    }
  }
}
```

That's it! The worker auto-loads all JSON files from `/sources`.

## Config Options

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier |
| `enabled` | No | Set `false` to disable |
| `fetch.url` | Yes | API endpoint |
| `fetch.method` | No | GET, POST, etc. (default: GET) |
| `fetch.headers` | No | Custom headers |
| `schedule.intervalMs` | Yes | How often to fetch (ms) |
| `schedule.ttlSeconds` | Yes | Redis cache TTL |
| `redis.key` | Yes | Redis key name |
| `transform.dataPath` | No | Path to data array (e.g., "data.items") |
| `transform.fields` | No | Map output fields to source fields |
| `transform.filter` | No | Filter by field values |

## Auth Options

```json
{
  "auth": {
    "type": "bearer",
    "envVar": "MY_API_TOKEN"
  }
}
```

Types: `bearer`, `apikey`, `basic`

For `apikey`, add `"header": "X-Custom-Header"` to specify the header name.

## API Route

Create a simple route in `src/app/api/my-source/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

export async function GET() {
  const data = await getFromRedis("kaos:my-source:data");
  if (!data) {
    return NextResponse.json({ error: "Data unavailable" }, { status: 503 });
  }
  return NextResponse.json(data);
}
```

## Custom Collectors

For complex sources (OAuth, WebSocket, multi-step), create a custom collector:

```typescript
// worker/src/collectors/my-source.ts
import { BaseCollector } from "./base-collector.js";

export class MySourceCollector extends BaseCollector {
  constructor() {
    super({
      name: "my-source",
      redisKey: "kaos:my-source:data",
      ttlSeconds: 120,
    });
  }

  protected async collect(): Promise<unknown[]> {
    // Your custom logic here
    const response = await fetch("...");
    return response.json();
  }
}
```

Then register in `worker/src/index.ts`.
