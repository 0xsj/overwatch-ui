import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(projectRoot, "app");

function collectPageFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPageFiles(entryPath));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeRouteSegment(segment) {
  if (segment.startsWith("[[...") && segment.endsWith("]]")) {
    return `*${segment.slice(5, -2)}?`;
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return `*${segment.slice(4, -1)}`;
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }
  return segment;
}

function describePage(filePath) {
  const relativePath = path.relative(appRoot, filePath);
  const segments = relativePath.split(path.sep);
  const directories = segments.slice(0, -1);
  const group = directories.find((segment) => segment.startsWith("(") && segment.endsWith(")"));
  const area = group ? group.slice(1, -1) : "root";
  const routeSegments = directories
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .map(normalizeRouteSegment);
  const route = routeSegments.length > 0 ? `/${routeSegments.join("/")}` : "/";
  const source = fs.readFileSync(filePath, "utf8");

  return {
    area,
    file: path.relative(projectRoot, filePath),
    hasDefaultExport: /export\s+default\s+/.test(source),
    hasMetadata:
      /export\s+(?:const\s+metadata\b|(?:async\s+)?function\s+generateMetadata\b)/.test(source),
    requiredMetadata: area !== "dev",
    route,
  };
}

if (!fs.existsSync(appRoot)) {
  console.error(`Route audit failed: ${appRoot} does not exist.`);
  process.exit(1);
}

const pages = collectPageFiles(appRoot).map(describePage).sort((left, right) =>
  left.route.localeCompare(right.route) || left.file.localeCompare(right.file),
);
const routeOwners = new Map();
const duplicateRoutes = [];

for (const page of pages) {
  const owners = routeOwners.get(page.route) ?? [];
  owners.push(page.file);
  routeOwners.set(page.route, owners);
}

for (const [route, owners] of routeOwners) {
  if (owners.length > 1) {
    duplicateRoutes.push({ owners, route });
  }
}

const missingDefaultExports = pages.filter((page) => !page.hasDefaultExport);
const missingMetadata = pages.filter((page) => page.requiredMetadata && !page.hasMetadata);
const devMetadataExceptions = pages.filter((page) => !page.requiredMetadata && !page.hasMetadata);
const countsByArea = new Map();

for (const page of pages) {
  countsByArea.set(page.area, (countsByArea.get(page.area) ?? 0) + 1);
}

console.log(`Route audit: ${pages.length} page modules, ${pages.length - devMetadataExceptions.length} customer-facing`);
console.log("Areas:");
for (const [area, count] of [...countsByArea.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`  ${area.padEnd(10)} ${count}`);
}
console.log(`Metadata coverage: ${pages.length - missingMetadata.length - devMetadataExceptions.length}/${pages.length - devMetadataExceptions.length} required routes`);

if (devMetadataExceptions.length > 0) {
  console.log("Dev-only metadata exceptions:");
  for (const page of devMetadataExceptions) {
    console.log(`  ${page.route} <- ${page.file}`);
  }
}

const failures = [];
if (duplicateRoutes.length > 0) {
  failures.push("duplicate normalized routes:");
  for (const duplicate of duplicateRoutes) {
    failures.push(`  ${duplicate.route} <- ${duplicate.owners.join(", ")}`);
  }
}
if (missingDefaultExports.length > 0) {
  failures.push("pages without a default export:");
  for (const page of missingDefaultExports) {
    failures.push(`  ${page.route} <- ${page.file}`);
  }
}
if (missingMetadata.length > 0) {
  failures.push("customer-facing pages without route metadata:");
  for (const page of missingMetadata) {
    failures.push(`  ${page.route} <- ${page.file}`);
  }
}

if (failures.length > 0) {
  console.error("Route audit failed:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Route audit passed: no duplicate routes or required page contract gaps.");
