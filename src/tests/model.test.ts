import { User } from "../database/models/User";
import { Post } from "../database/models/Post";

(async () => {
  const userModel = new User();

  // Get a user
  const user = await userModel.find(1);
  console.log("User:", user);

  // Get all user's posts
  const posts = await userModel.hasMany(Post, "user_id", "id");
  console.log("User posts:", posts);

  // From post to user
  const postModel = new Post();
  const post = await postModel.find(1);
  const author = await postModel.belongsTo(User, "user_id");
  console.log("Post author:", author);
})();
