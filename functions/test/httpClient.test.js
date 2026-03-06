const {expect} = require("chai");

describe("httpClient", () => {
  describe("module structure", () => {
    it("should export postAlert and EXTENSION_VERSION", () => {
      const httpClient = require("../lib/httpClient");
      expect(httpClient.postAlert).to.be.a("function");
      expect(httpClient.EXTENSION_VERSION).to.equal("0.1.0");
    });
  });
});
