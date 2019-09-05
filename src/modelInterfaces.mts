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

meta interface Notification {
    id: "string",
    recipient: "string",
    title: "string",
    content: "string",
    date: "number",
    read: "boolean"
} end meta interface
export {Notification, NotificationDefinition};
