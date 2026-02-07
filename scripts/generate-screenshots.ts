import { chromium, type Page, type Browser } from "playwright";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Screenshot configuration for each data source
interface ScreenshotConfig {
  id: string;
  name: string;
  overlayLabel: string;
  overlayType: "radio" | "checkbox";
  section?: string;
  view: MapView;
  waitTime?: number;
}

interface MapView {
  center: [number, number]; // [lat, lng]
  zoom: number;
}

// Map views
const VIEWS = {
  europe: { center: [48, 10] as [number, number], zoom: 4 },
  europeWide: { center: [50, 5] as [number, number], zoom: 3 },
  portugal: { center: [39.5, -8] as [number, number], zoom: 7 },
  global: { center: [20, 0] as [number, number], zoom: 2 },
  globalDisasters: { center: [30, 15] as [number, number], zoom: 3 }, // Shows Europe/Africa/Middle East region
  northernHemisphere: { center: [60, 0] as [number, number], zoom: 2 },
  atlantic: { center: [35, -30] as [number, number], zoom: 3 },
  iberianPeninsula: { center: [40, -5] as [number, number], zoom: 6 },
};

// Screenshot configurations
const SCREENSHOTS: ScreenshotConfig[] = [
  // GFS Forecast overlays
  {
    id: "gfs-temperature",
    name: "Temperature Forecast",
    overlayLabel: "Temperature",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "gfs-humidity",
    name: "Humidity Forecast",
    overlayLabel: "Humidity",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "gfs-precipitation",
    name: "Precipitation Forecast",
    overlayLabel: "Precipitation",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "gfs-cloud-cover",
    name: "Cloud Cover Forecast",
    overlayLabel: "Cloud Cover",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "gfs-cape",
    name: "Storm Potential (CAPE)",
    overlayLabel: "Storm Potential",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "gfs-fire-weather",
    name: "Fire Weather Index",
    overlayLabel: "Fire Weather",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },

  // Ocean overlays
  {
    id: "ocean-waves",
    name: "Wave Height",
    overlayLabel: "Wave Height",
    overlayType: "radio",
    view: VIEWS.atlantic,
    waitTime: 3000,
  },
  {
    id: "ocean-sst",
    name: "Sea Surface Temperature",
    overlayLabel: "Sea Temperature",
    overlayType: "radio",
    view: VIEWS.atlantic,
    waitTime: 3000,
  },

  // Environment overlays
  {
    id: "air-quality",
    name: "Air Quality",
    overlayLabel: "Air Quality",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 4000,
  },
  {
    id: "uv-index",
    name: "UV Index",
    overlayLabel: "UV Index",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "aurora",
    name: "Aurora Forecast",
    overlayLabel: "Aurora",
    overlayType: "radio",
    view: VIEWS.northernHemisphere,
    waitTime: 3000,
  },

  // Flow overlays - need extra time for particle animations to render
  {
    id: "wind-flow",
    name: "Wind Flow",
    overlayLabel: "Wind Flow",
    overlayType: "radio",
    view: VIEWS.europe,
    waitTime: 8000, // Particles need time to animate
  },
  {
    id: "ocean-currents",
    name: "Ocean Currents",
    overlayLabel: "Ocean Currents",
    overlayType: "radio",
    view: VIEWS.atlantic,
    waitTime: 8000, // Particles need time to animate
  },

  // Hazard overlays
  {
    id: "earthquakes",
    name: "Earthquakes",
    overlayLabel: "Earthquakes",
    overlayType: "checkbox",
    view: VIEWS.europeWide,
    waitTime: 3000,
  },
  {
    id: "gdacs",
    name: "Global Disasters (GDACS)",
    overlayLabel: "Global Disasters",
    overlayType: "checkbox",
    view: VIEWS.globalDisasters,
    waitTime: 3000,
  },
  {
    id: "warnings",
    name: "IPMA Weather Warnings",
    overlayLabel: "IPMA Warnings",
    overlayType: "checkbox",
    view: VIEWS.portugal,
    waitTime: 3000,
  },
  {
    id: "fires",
    name: "Active Fires",
    overlayLabel: "Active Fires",
    overlayType: "checkbox",
    view: VIEWS.europe,
    waitTime: 3000,
  },
  {
    id: "rainfall",
    name: "Rainfall Stations",
    overlayLabel: "Rainfall",
    overlayType: "checkbox",
    view: VIEWS.portugal,
    waitTime: 3000,
  },

  // Radio & Tracking overlays - these fetch data based on map bounds, need extra wait
  {
    id: "aircraft",
    name: "Aircraft Tracking",
    overlayLabel: "Aircraft",
    overlayType: "checkbox",
    view: VIEWS.iberianPeninsula, // Smaller area = faster data fetch
    waitTime: 6000,
  },
  {
    id: "lightning",
    name: "Lightning Detection",
    overlayLabel: "Lightning",
    overlayType: "checkbox",
    view: VIEWS.europe,
    waitTime: 4000,
  },
  {
    id: "kiwisdr",
    name: "WebSDR Stations",
    overlayLabel: "WebSDR",
    overlayType: "checkbox",
    view: VIEWS.europe,
    waitTime: 4000,
  },
  {
    id: "aprs",
    name: "APRS Stations",
    overlayLabel: "APRS",
    overlayType: "checkbox",
    view: VIEWS.iberianPeninsula, // Smaller area = faster data fetch
    waitTime: 10000, // APRS needs more time to fetch
  },
  {
    id: "ionosphere",
    name: "Ionosphere & Space Weather",
    overlayLabel: "Ionosphere",
    overlayType: "checkbox",
    view: VIEWS.global,
    waitTime: 3000,
  },

  // Utility overlays
  {
    id: "terminator",
    name: "Day/Night Terminator",
    overlayLabel: "Day/Night",
    overlayType: "checkbox",
    view: VIEWS.global,
    waitTime: 2000,
  },
];

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "screenshots");
const VIEWPORT = { width: 1920, height: 1080 };

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function waitForMapReady(page: Page) {
  // Wait for Leaflet map container
  await page.waitForSelector(".leaflet-container", { timeout: 30000 });
  // Wait for tiles to load
  await page.waitForTimeout(2000);
}

async function setMapView(page: Page, view: MapView) {
  const { center, zoom } = view;
  const [lat, lng] = center;

  // Use the exposed __LEAFLET_MAP__ from MapExposer component
  await page.evaluate(
    ({ lat, lng, zoom }) => {
      // Use the exposed map reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = (window as any).__LEAFLET_MAP__;
      if (map && typeof map.setView === "function") {
        map.setView([lat, lng], zoom, { animate: false });
      } else {
        // Fallback: dispatch custom event
        window.dispatchEvent(
          new CustomEvent("setMapView", {
            detail: { lat, lng, zoom },
          })
        );
      }
    },
    { lat, lng, zoom }
  );

  // Wait for tiles to load after view change
  await page.waitForTimeout(1500);
}

async function triggerMapRefresh(page: Page) {
  // Trigger a tiny zoom change to force overlays to refresh their data
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = (window as any).__LEAFLET_MAP__;
    if (map && typeof map.getZoom === "function") {
      const currentZoom = map.getZoom();
      // Zoom out slightly then back - this triggers moveend events
      map.setZoom(currentZoom - 0.01, { animate: false });
      setTimeout(() => {
        map.setZoom(currentZoom, { animate: false });
      }, 100);
    }
  });
  await page.waitForTimeout(500);
}

async function openLayersPanel(page: Page) {
  // Look for the layers button (has Layers icon)
  const layersBtn = page.locator('button').filter({ has: page.locator('svg.lucide-layers') });

  if (await layersBtn.count() > 0 && await layersBtn.first().isVisible()) {
    await layersBtn.first().click();
    await page.waitForTimeout(500);
  }
}

async function closeLayersPanel(page: Page) {
  // Close button inside the floating panel
  const closeBtn = page.locator('.fixed').filter({ has: page.locator('text=Layers') }).locator('button').filter({ has: page.locator('svg.lucide-x') });

  if (await closeBtn.count() > 0 && await closeBtn.first().isVisible()) {
    await closeBtn.first().click();
    await page.waitForTimeout(300);
  }
}

async function closeSidepanel(page: Page) {
  // Close the reports sidepanel if it's open (look for PanelRightClose icon)
  const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-panel-right-close') });

  if (await closeBtn.count() > 0 && await closeBtn.first().isVisible()) {
    await closeBtn.first().click();
    await page.waitForTimeout(300);
  }
}

async function expandAllSections(page: Page) {
  // Click all collapsed section headers (those with chevron-right)
  const collapsedSections = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
  const count = await collapsedSections.count();

  for (let i = 0; i < count; i++) {
    const section = collapsedSections.nth(i);
    if (await section.isVisible()) {
      await section.click();
      await page.waitForTimeout(200);
    }
  }
}

async function disableAllOverlays(page: Page) {
  // Click all "None" radio buttons to disable image/flow overlays
  const noneRadios = page.locator('button[role="radio"]').filter({ hasText: "None" });
  const radioCount = await noneRadios.count();

  for (let i = 0; i < radioCount; i++) {
    const radio = noneRadios.nth(i);
    if (await radio.isVisible()) {
      await radio.click();
      await page.waitForTimeout(100);
    }
  }

  // Uncheck all checked checkboxes
  const checkedBoxes = page.locator('button[role="checkbox"][aria-checked="true"]');
  const checkCount = await checkedBoxes.count();

  for (let i = 0; i < checkCount; i++) {
    const checkbox = checkedBoxes.nth(i);
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(100);
    }
  }
}

async function enableOverlay(page: Page, label: string, type: "radio" | "checkbox") {
  const role = type === "radio" ? "radio" : "checkbox";

  // Find the button with the matching label text
  const overlayBtn = page.locator(`button[role="${role}"]`).filter({ hasText: label }).first();

  if (await overlayBtn.isVisible()) {
    await overlayBtn.click();
    await page.waitForTimeout(300);
    return true;
  }

  console.log(`    Warning: Could not find overlay button for "${label}"`);
  return false;
}

async function takeScreenshot(page: Page, config: ScreenshotConfig): Promise<boolean> {
  console.log(`  📸 ${config.name}...`);

  try {
    // Close the reports sidepanel first for a clean screenshot
    await closeSidepanel(page);
    await page.waitForTimeout(200);

    // Set map view FIRST - important for overlays that fetch data based on map bounds
    await setMapView(page, config.view);
    await page.waitForTimeout(500);

    // Open layers panel
    await openLayersPanel(page);
    await page.waitForTimeout(300);

    // Expand all sections
    await expandAllSections(page);
    await page.waitForTimeout(300);

    // Disable all overlays first
    await disableAllOverlays(page);
    await page.waitForTimeout(500);

    // Enable the specific overlay (data will fetch for current map bounds)
    const enabled = await enableOverlay(page, config.overlayLabel, config.overlayType);
    if (!enabled) {
      console.log(`    ⚠️  Skipped: Could not enable overlay`);
      return false;
    }

    // Close the layers panel
    await closeLayersPanel(page);
    await page.waitForTimeout(300);

    // Trigger a map refresh to force data-dependent overlays to fetch
    await triggerMapRefresh(page);

    // Wait for data to load (some overlays fetch data based on map bounds)
    await page.waitForTimeout(config.waitTime || 2000);

    // Take the screenshot
    const filename = `${config.id}.png`;
    await page.screenshot({
      path: path.join(OUTPUT_DIR, filename),
      fullPage: false,
    });

    console.log(`    ✅ Saved: ${filename}`);
    return true;
  } catch (error) {
    console.log(`    ❌ Failed: ${error}`);
    return false;
  }
}

async function startDevServer(): Promise<ChildProcess | null> {
  // Check if server is already running
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      console.log("✓ Dev server already running\n");
      return null;
    }
  } catch {
    // Server not running
  }

  console.log("Starting dev server...");
  const server = spawn("pnpm", ["dev"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    shell: true,
  });

  // Wait for server to be ready
  let attempts = 0;
  const maxAttempts = 60;
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        console.log("✓ Dev server ready\n");
        return server;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
    if (attempts % 10 === 0) {
      console.log(`  Waiting for server... (${attempts}s)`);
    }
  }

  throw new Error("Dev server failed to start within 60 seconds");
}

async function main() {
  console.log("\n🖼️  Sentinela Screenshot Generator");
  console.log("=====================================\n");

  await ensureOutputDir();
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  const server = await startDevServer();
  let browser: Browser | null = null;

  try {
    console.log("🌐 Launching browser...\n");
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    // Navigate and wait for load
    console.log(`📍 Loading ${BASE_URL}...\n`);
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
    await waitForMapReady(page);

    console.log(`📷 Taking ${SCREENSHOTS.length} screenshots:\n`);

    let successCount = 0;
    let failCount = 0;

    for (const config of SCREENSHOTS) {
      const success = await takeScreenshot(page, config);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Take overview screenshot (no overlays)
    console.log("\n  📸 Overview (no overlays)...");
    await openLayersPanel(page);
    await expandAllSections(page);
    await disableAllOverlays(page);
    await closeLayersPanel(page);
    await closeSidepanel(page);
    await setMapView(page, VIEWS.europe);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "overview.png"),
      fullPage: false,
    });
    console.log("    ✅ Saved: overview.png");
    successCount++;

    console.log(`\n=====================================`);
    console.log(`✅ Success: ${successCount} screenshots`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} screenshots`);
    }
    console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  } finally {
    if (browser) {
      await browser.close();
    }
    if (server && server.pid) {
      console.log("Stopping dev server...");
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        // Process might already be dead
      }
    }
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
