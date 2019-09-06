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

meta interface Session {
    id: "string",
    userName: "string | undefined",
    creationDate: "string"
} end meta interface
export {Session, SessionDefinition}

meta interface Activity {
    id: "string",
    objectId: "string",
    published: "number",
    author: "string",
    to: "string[]"
} end meta interface
export {Activity, ActivityDefinition};
