const {expect} = require("chai");

describe("httpClient", () => {
  let httpClient;

  before(() => {
    httpClient = require("../lib/httpClient");
  });

  describe("module structure", () => {
    it("should export postAlert and EXTENSION_VERSION", () => {
      expect(httpClient.postAlert).to.be.a("function");
      expect(httpClient.EXTENSION_VERSION).to.be.a("string");
    });
  });

  describe("EXTENSION_VERSION", () => {
    it("should match package.json version", () => {
      const pkg = require("../package.json");
      expect(httpClient.EXTENSION_VERSION).to.equal(pkg.version);
    });

    it("should be 1.0.0", () => {
      expect(httpClient.EXTENSION_VERSION).to.equal("1.0.0");
    });
  });

  describe("postAlert", () => {
    it("should reject HTTP URLs (require HTTPS)", async () => {
      try {
        await httpClient.postAlert(
            "http://example.com/alert",
            "tnx_test_token",
            {alertType: "fatal"},
        );
        expect.fail("Should have thrown for HTTP URL");
      } catch (error) {
        expect(error.message).to.include("HTTPS");
      }
    });
  });
});
