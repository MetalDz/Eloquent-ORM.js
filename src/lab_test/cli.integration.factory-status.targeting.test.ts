import { assertCliSuccess, runCli } from "./support/cli.integration.harness.js";
import {
  describeIfBuiltOnly,
  registerConnectionFixtureLifecycle,
} from "./support/cli.integration.connection.shared.js";

describeIfBuiltOnly("CLI integration: factory:status targeting", () => {
  registerConnectionFixtureLifecycle();

  test("factory:status --details --test exits cleanly", () => {
    const args = ["factory:status", "--details", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Factory Status");
    expect(result.combined).toMatch(/\d+ factories registered\./);
    expect(result.combined).toContain("CommentFactory");
    expect(result.combined).toContain("PostFactory");
    expect(result.combined).toContain("UserFactory");
    expect(result.combined).toContain("PostUserPivotFactory");
    expect(result.combined).toContain("UserPostPivotFactory");
  });

  test("factory:status --graph --test exits cleanly", () => {
    const args = ["factory:status", "--graph", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Model Relationship Graph");
    expect(result.combined).toContain("Comment");
    expect(result.combined).toContain("Post");
    expect(result.combined).toContain("User");
    expect(result.combined).toContain("Commentable");
  }); 
});
