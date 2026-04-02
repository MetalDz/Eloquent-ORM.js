import cjsModelPackage from "../dist/Model.js";

const {
  SqlModel,
  MongoModel,
} = cjsModelPackage as typeof import("../dist/Model.js");

export {
  SqlModel,
  MongoModel,
};

export default cjsModelPackage;
