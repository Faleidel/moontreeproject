//WARNING, THIS FILE IS COMPUTER GENERATED, PLEASE REFER TO THE HUMAN VERSION AT src/modelInterfaces.mts

let UserDefinition = {
    "name": "string",
    "passwordHashed": "string",
    "passwordSalt": "string",
    "publicKey": "string",
    "privateKey": "string",
    "banned": "boolean",
    "local": "boolean",
    "lastUpdate": "number",
    "foreignUrl": "string"
};

interface User {
    name: string,
    passwordHashed: string,
    passwordSalt: string,
    publicKey: string,
    privateKey: string,
    banned: boolean,
    local: boolean,
    lastUpdate: number,
    foreignUrl: string
}


export {User, UserDefinition};


let NotificationDefinition = {
    "id": "string",
    "recipient": "string",
    "title": "string",
    "content": "string",
    "date": "number",
    "read": "boolean"
};

interface Notification {
    id: string,
    recipient: string,
    title: string,
    content: string,
    date: number,
    read: boolean
}


export {Notification, NotificationDefinition};
