import { Factory } from "eloquentjs";
import { Comment } from "../models/Comment";

export class CommentFactory extends Factory<Comment> {
  model = Comment;

  definition(index = 0): Partial<Comment> {
    return {

      name: this.faker.person.fullName(),

      commentable_id: this.faker.number.int(),

      commentable_type: this.faker.person.fullName(),
    };
  }
}