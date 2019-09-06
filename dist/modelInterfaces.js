"use strict";
//WARNING, THIS FILE IS COMPUTER GENERATED, PLEASE REFER TO THE HUMAN VERSION AT src/modelInterfaces.mts
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.UserDefinition = UserDefinition;
let NotificationDefinition = {
    "id": "string",
    "recipient": "string",
    "title": "string",
    "content": "string",
    "date": "number",
    "read": "boolean"
};
exports.NotificationDefinition = NotificationDefinition;
let SessionDefinition = {
    "id": "string",
    "userName": "string | undefined",
    "creationDate": "string"
};
exports.SessionDefinition = SessionDefinition;
let ActivityDefinition = {
    "id": "string",
    "objectId": "string",
    "published": "number",
    "author": "string",
    "to": "string[]"
};
exports.ActivityDefinition = ActivityDefinition;
