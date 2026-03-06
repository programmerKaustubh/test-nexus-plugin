const {expect} = require("chai");
const {buildPayload} = require("../lib/payloadBuilder");

describe("payloadBuilder", () => {
  describe("buildPayload", () => {
    it("should build fatal issue payload", () => {
      const event = {
        data: {
          issue: {
            id: "issue-123",
            title: "NullPointerException",
            subtitle: "at com.example.App.onCreate",
            appVersion: "1.2.3",
            crashCount: 42,
            createTime: "2026-03-05T10:00:00Z",
          },
          bundleId: "com.example.app",
        },
      };

      const result = buildPayload("fatal", event, "My App");

      expect(result.alertType).to.equal("fatal");
      expect(result.appIdentifier).to.equal("My App");
      expect(result.issueId).to.equal("issue-123");
      expect(result.issueTitle).to.equal("NullPointerException");
      expect(result.crashCount).to.equal(42);
      expect(result.bundleId).to.equal("com.example.app");
    });

    it("should build regression payload with prefix", () => {
      const event = {
        data: {
          issue: {
            id: "issue-456",
            title: "OOM Error",
          },
        },
      };

      const result = buildPayload("regression", event, "Test App");

      expect(result.alertType).to.equal("regression");
      expect(result.issueTitle).to.equal("Regression: OOM Error");
    });

    it("should build velocity payload with crash percentage", () => {
      const event = {
        data: {
          issue: {
            id: "issue-789",
            title: "Layout crash",
            crashPercentage: 2.5,
          },
        },
      };

      const result = buildPayload("velocity", event, "Prod App");

      expect(result.alertType).to.equal("velocity");
      expect(result.crashPercentage).to.equal(2.5);
    });

    it("should build digest payload with trending issues", () => {
      const event = {
        data: {
          trendingIssues: [
            {id: "a", title: "Crash A", crashCount: 10},
            {id: "b", title: "Crash B", crashCount: 5},
          ],
        },
      };

      const result = buildPayload("digest", event, "App");

      expect(result.alertType).to.equal("digest");
      expect(result.issueTitle).to.include("2 trending issue(s)");
      expect(result.crashCount).to.equal(15);
    });

    it("should handle missing data gracefully", () => {
      const event = {data: {}};
      const result = buildPayload("fatal", event, "App");

      expect(result.alertType).to.equal("fatal");
      expect(result.issueTitle).to.equal("New issue detected");
      expect(result.crashCount).to.equal(0);
    });
  });
});
