import { ConfigDiff, ChangeType } from "../lib/configDiffer";
import { applyWatchlistFilter, shouldSendAlert, getWatchlistChanges } from "../lib/watchlistFilter";

function createDiff(overrides: Partial<ConfigDiff> = {}): ConfigDiff {
  return {
    changes: [],
    totalChanged: 0,
    totalAdded: 0,
    totalModified: 0,
    totalRemoved: 0,
    isRollback: false,
    previousVersion: 1,
    currentVersion: 2,
    ...overrides,
  };
}

describe("watchlistFilter", () => {
  describe("applyWatchlistFilter", () => {
    it("should return diff unchanged when watchlist is empty", () => {
      const diff = createDiff({
        changes: [{ key: "key1", changeType: ChangeType.ADDED, isWatchlistKey: false }],
        totalChanged: 1,
      });
      const result = applyWatchlistFilter(diff, "");
      expect(result.changes[0].isWatchlistKey).toBe(false);
    });

    it("should flag matching watchlist keys", () => {
      const diff = createDiff({
        changes: [
          { key: "watched_key", changeType: ChangeType.MODIFIED, isWatchlistKey: false },
          { key: "other_key", changeType: ChangeType.ADDED, isWatchlistKey: false },
        ],
        totalChanged: 2,
      });
      const result = applyWatchlistFilter(diff, "watched_key,another");
      expect(result.changes[0].isWatchlistKey).toBe(true);
      expect(result.changes[1].isWatchlistKey).toBe(false);
    });
  });

  describe("shouldSendAlert", () => {
    it("should return false when no changes", () => {
      expect(shouldSendAlert(createDiff(), true)).toBe(false);
    });

    it("should return true for rollbacks regardless of watchlist", () => {
      const diff = createDiff({ totalChanged: 1, isRollback: true, changes: [{ key: "k", changeType: ChangeType.MODIFIED, isWatchlistKey: false }] });
      expect(shouldSendAlert(diff, false)).toBe(true);
    });

    it("should return true with notifyAllChanges=true when changes exist", () => {
      const diff = createDiff({ totalChanged: 1, changes: [{ key: "k", changeType: ChangeType.ADDED, isWatchlistKey: false }] });
      expect(shouldSendAlert(diff, true)).toBe(true);
    });

    it("should return false with notifyAllChanges=false and no watchlist hits", () => {
      const diff = createDiff({ totalChanged: 1, changes: [{ key: "k", changeType: ChangeType.ADDED, isWatchlistKey: false }] });
      expect(shouldSendAlert(diff, false)).toBe(false);
    });
  });

  describe("getWatchlistChanges", () => {
    it("should return only watchlist changes", () => {
      const diff = createDiff({
        changes: [
          { key: "watched", changeType: ChangeType.MODIFIED, isWatchlistKey: true },
          { key: "other", changeType: ChangeType.ADDED, isWatchlistKey: false },
        ],
      });
      const result = getWatchlistChanges(diff);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("watched");
    });
  });
});
