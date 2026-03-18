import { ChangeType } from "../lib/configDiffer";

// Mock firebase-admin
const mockGetTemplate = jest.fn();
const mockGetTemplateAtVersion = jest.fn();

jest.mock("firebase-admin", () => ({
  remoteConfig: () => ({
    getTemplate: mockGetTemplate,
    getTemplateAtVersion: mockGetTemplateAtVersion,
  }),
}));

jest.mock("firebase-functions/v2", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { computeDiff } from "../lib/configDiffer";

describe("configDiffer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: empty previous — all ADDED
  it("should detect all parameters as ADDED when previous version is empty", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: {
        key1: { defaultValue: { value: "val1" } },
        key2: { defaultValue: { value: "val2" } },
      },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({ parameters: {} });

    const diff = await computeDiff(2, true);
    expect(diff.totalAdded).toBe(2);
    expect(diff.totalModified).toBe(0);
    expect(diff.totalRemoved).toBe(0);
    expect(diff.changes[0].changeType).toBe(ChangeType.ADDED);
  });

  // Test 2: identical templates — empty diff
  it("should return empty diff for identical templates", async () => {
    const params = { key1: { defaultValue: { value: "val1" } } };
    mockGetTemplate.mockResolvedValue({
      parameters: params,
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({ parameters: params });

    const diff = await computeDiff(2, true);
    expect(diff.totalChanged).toBe(0);
  });

  // Test 3: mixed changes
  it("should detect ADDED, MODIFIED, and REMOVED changes", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: {
        existing: { defaultValue: { value: "new_val" } },
        added: { defaultValue: { value: "new" } },
      },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({
      parameters: {
        existing: { defaultValue: { value: "old_val" } },
        removed: { defaultValue: { value: "gone" } },
      },
    });

    const diff = await computeDiff(2, true);
    expect(diff.totalAdded).toBe(1);
    expect(diff.totalModified).toBe(1);
    expect(diff.totalRemoved).toBe(1);
    expect(diff.totalChanged).toBe(3);
  });

  // Test 4: rollback detection
  it("should detect rollback from updateType", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: {},
      version: { updateType: "ROLLBACK" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({ parameters: {} });

    const diff = await computeDiff(2, false);
    expect(diff.isRollback).toBe(true);
  });

  // Test 5: includeValues=false
  it("should omit values when includeValues is false", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: { key1: { defaultValue: { value: "val" } } },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({ parameters: {} });

    const diff = await computeDiff(2, false);
    expect(diff.changes[0].newValue).toBeUndefined();
  });

  // Test 6: includeValues=true
  it("should include values when includeValues is true", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: { key1: { defaultValue: { value: "new_val" } } },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({
      parameters: { key1: { defaultValue: { value: "old_val" } } },
    });

    const diff = await computeDiff(2, true);
    expect(diff.changes[0].oldValue).toBe("old_val");
    expect(diff.changes[0].newValue).toBe("new_val");
  });

  // Test 7: first version
  it("should handle first version gracefully (previousVersion=0)", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: { key1: { defaultValue: { value: "val" } } },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });

    const diff = await computeDiff(1, true);
    expect(diff.previousVersion).toBe(0);
    expect(diff.totalAdded).toBe(1);
    expect(mockGetTemplateAtVersion).not.toHaveBeenCalled();
  });

  // Test 8: useInAppDefault
  it("should handle useInAppDefault value type", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: { key1: { defaultValue: { useInAppDefault: true } } },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({
      parameters: { key1: { defaultValue: { value: "old" } } },
    });

    const diff = await computeDiff(2, true);
    expect(diff.changes[0].newValue).toBe("(in-app default)");
    expect(diff.changes[0].oldValue).toBe("old");
  });

  // Test 9: conditional value change detected
  it("should detect changes in conditionalValues even when default is unchanged", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: {
        feature_flag: {
          defaultValue: { value: "true" },
          conditionalValues: {
            "android_condition": { value: "false" },
          },
        },
      },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({
      parameters: {
        feature_flag: {
          defaultValue: { value: "true" },
          conditionalValues: {
            "android_condition": { value: "true" },
          },
        },
      },
    });

    const diff = await computeDiff(2, true);
    expect(diff.totalModified).toBe(1);
    expect(diff.changes[0].key).toBe("feature_flag");
    expect(diff.changes[0].changeType).toBe(ChangeType.MODIFIED);
  });

  // Test 10: no change when both default and conditionals are identical
  it("should not detect change when default and conditionals are both identical", async () => {
    mockGetTemplate.mockResolvedValue({
      parameters: {
        feature_flag: {
          defaultValue: { value: "true" },
          conditionalValues: {
            "android_condition": { value: "v2" },
          },
        },
      },
      version: { updateType: "INCREMENTAL_UPDATE" },
    });
    mockGetTemplateAtVersion.mockResolvedValue({
      parameters: {
        feature_flag: {
          defaultValue: { value: "true" },
          conditionalValues: {
            "android_condition": { value: "v2" },
          },
        },
      },
    });

    const diff = await computeDiff(2, true);
    expect(diff.totalChanged).toBe(0);
  });
});
