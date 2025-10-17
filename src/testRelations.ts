import { User } from "./models/User";

(async () => {
  const user = await new User().find(1);
  const posts = await new User().posts().getResults(user);

  console.log("User:", user);
  console.log("Posts:", posts);
})();
