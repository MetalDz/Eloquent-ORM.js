export class Model {
  protected table: string = "";

  static find(id: number) {
    console.log(`Finding record with id ${id}`);
  }

  static all() {
    console.log(`Getting all records`);
  }
}
