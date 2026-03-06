import { assertCliSuccess, runCli } from "./support/cli.integration.harness";
import {
  describeIfBuiltOnly,
  registerConnectionFixtureLifecycle,
} from "./support/cli.integration.connection.shared";

describeIfBuiltOnly("CLI integration: factory:status targeting", () => {
  registerConnectionFixtureLifecycle();

  test("factory:status --details --test exits cleanly", () => {
    const args = ["factory:status", "--details", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Factory Status");
    expect(result.combined).toContain("CommentFactory");
  });

  test("factory:status --graph --test exits cleanly", () => {
    const args = ["factory:status", "--graph", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Model Relationship Graph");
    expect(result.combined).toContain("User");
  });
});
