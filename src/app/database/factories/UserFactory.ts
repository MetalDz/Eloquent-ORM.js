import { Factory } from "../../../cli/utils/factories/Factory";
import { User } from "../../models/User";

export class UserFactory extends Factory<User> {
  model = User;

  definition(index = 0): Partial<User> {
    return {

      name: this.faker.person.fullName(),
    };
  }
}