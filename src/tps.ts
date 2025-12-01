let x;
x = 10;
x = "hello";
x = true;


interface Name{
    first: string;
    last: string;
    middle?: string;
}

let person: Name = {
    first: "John",
    last: "Doe",
    middle: "N/A"
};



interface User{
    id: number;
    username: Name["first"];
    email?: string
}
let user: User = {
    id: 1,
    username: person.first
}

const testName = person.middle! | User.email!;
console.log(user);