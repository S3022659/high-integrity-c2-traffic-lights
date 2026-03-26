import fs from 'fs';
import path from 'path';

interface RequirementEntry {
  id: string;
  invariantId: string;
  testId: string;
  title: string;
}

const parseRequirementsRegistry = (yamlContent: string): RequirementEntry[] => {
  const lines = yamlContent.split(/\r?\n/);
  const entries: RequirementEntry[] = [];
  let current: Partial<RequirementEntry> | null = null;

  for (const line of lines) {
    const itemStart = line.match(/^\s*-\s+id:\s*(\S+)\s*$/);
    if (itemStart) {
      if (current?.id && current.invariantId && current.testId && current.title) {
        entries.push(current as RequirementEntry);
      }
      current = { id: itemStart[1] };
      continue;
    }

    if (!current) {
      continue;
    }

    const invariantMatch = line.match(/^\s+invariantId:\s*(\S+)\s*$/);
    if (invariantMatch) {
      current.invariantId = invariantMatch[1];
      continue;
    }

    const testIdMatch = line.match(/^\s+testId:\s*(\S+)\s*$/);
    if (testIdMatch) {
      current.testId = testIdMatch[1];
      continue;
    }

    const titleMatch = line.match(/^\s+title:\s*(\S+)\s*$/);
    if (titleMatch) {
      current.title = titleMatch[1];
    }
  }

  if (current?.id && current.invariantId && current.testId && current.title) {
    entries.push(current as RequirementEntry);
  }

  return entries;
};

const parseFormalTestTitles = (testFileContent: string): string[] => {
  const titles: string[] = [];
  const titleRegex = /test\(\s*['"]([^'"]+)['"]/g;

  let match = titleRegex.exec(testFileContent);
  while (match) {
    const title = match[1];
    if (title.startsWith('SR-')) {
      titles.push(title);
    }
    match = titleRegex.exec(testFileContent);
  }

  return titles;
};

describe('Formal requirements traceability', () => {
  const rootDir = path.resolve(__dirname, '..');
  const registryPath = path.join(rootDir, 'docs', 'formal-requirements.yaml');
  const controllerTestPath = path.join(rootDir, 'tests', 'controller.test.ts');

  test('every formal requirement has at least one mapped test title', () => {
    const registry = parseRequirementsRegistry(fs.readFileSync(registryPath, 'utf-8'));
    const testTitles = parseFormalTestTitles(fs.readFileSync(controllerTestPath, 'utf-8'));

    for (const req of registry) {
      const expectedPrefix = `${req.testId}__`;
      const mapped = testTitles.some((title) => title.startsWith(expectedPrefix));

      expect(mapped).toBe(true);
    }
  });

  test('formal test titles do not reference unknown requirement IDs', () => {
    const registry = parseRequirementsRegistry(fs.readFileSync(registryPath, 'utf-8'));
    const allowedPrefixes = new Set(registry.map((req) => `${req.testId}__`));

    const testTitles = parseFormalTestTitles(fs.readFileSync(controllerTestPath, 'utf-8'));
    for (const title of testTitles) {
      const matchesKnownPrefix = [...allowedPrefixes].some((prefix) =>
        title.startsWith(prefix)
      );
      expect(matchesKnownPrefix).toBe(true);
    }
  });
});
