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


let SessionDefinition = {
    "id": "string",
    "userName": "string | undefined",
    "creationDate": "string"
};

interface Session {
    id: string,
    userName: string | undefined,
    creationDate: string
}


export {Session, SessionDefinition}


let ActivityDefinition = {
    "id": "string",
    "objectId": "string",
    "published": "number",
    "author": "string",
    "to": "string[]"
};

interface Activity {
    id: string,
    objectId: string,
    published: number,
    author: string,
    to: string[]
}


export {Activity, ActivityDefinition};
