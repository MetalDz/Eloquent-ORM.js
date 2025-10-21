import { BaseModel } from "../src/core/model/BaseModel";



const user = new BaseModel("users", "mysql");

// Create
await user.create({ name: "Fares", email: "test@example.com" });

// Soft delete
await user.delete(1); // marks deleted_at

// Should not appear in all()
console.log(await user.all()); // []

// Should appear in withTrashed()
console.log(await user.withTrashed()); // [ { deleted_at: '2025-10-18T...', ... } ]

// Restore it
await user.restore(1);

// Now it’s visible again
console.log(await user.all());
