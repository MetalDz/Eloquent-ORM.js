import { Factory } from "eloquentjs";
import { Post } from "../../models/Post";

export class PostFactory extends Factory<Post> {
  model = Post;

  definition(index = 0): Partial<Post> {
    return {

      name: this.faker.person.fullName(),
    };
  }
}