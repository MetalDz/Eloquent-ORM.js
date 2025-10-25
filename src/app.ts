// src/app.ts
import { setupCache } from "./core/cache/setupCache";
import { BaseModel } from "./core/model/BaseModel";

// Initialize cache layer
setupCache();

// Example usage
(async () => {
  const User = new BaseModel();

  const users = await User.cache(60).all();
  console.log("Fetched users:", users);
  
})();