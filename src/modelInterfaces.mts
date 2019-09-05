meta interface User {
    name: "string",
    passwordHashed: "string",
    passwordSalt: "string",
    publicKey: "string",
    privateKey: "string",
    banned: "boolean",
    
    local: "boolean",
    lastUpdate: "number",
    foreignUrl: "string"
} end meta interface

export {User, UserDefinition};
