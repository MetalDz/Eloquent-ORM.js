import { Factory } from "../../../cli/utils/factories/Factory";
import { Comment } from "../../models/Comment";

export class CommentFactory extends Factory<Comment> {
  model = Comment;

  definition(index = 0): Partial<Comment> {
    return {

      name: this.faker.person.fullName(),
    };
  }
}