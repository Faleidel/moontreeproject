"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
//WARNING, THIS FILE IS COMPUTER GENERATED, PLEASE REFER TO THE HUMAN VERSION AT src/modelInterfaces.mts
const db = __importStar(require("./db"));
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
let BranchDefinition = {
    "name": "string",
    "creator": "string",
    "description": "string",
    "sourceBranches": "string[]",
    "pinedThreads": "string[]",
    "banned": "boolean",
    "icon": "string",
    "publicKey": "string",
    "privateKey": "string",
    "lastUpdate": "number"
};
exports.BranchDefinition = BranchDefinition;
let LikeDefinition = {
    "id": "string",
    "author": "string",
    "object": "string"
};
exports.LikeDefinition = LikeDefinition;
let FollowDefinition = {
    "follower": "string",
    "target": "string",
    "id": "string"
};
exports.FollowDefinition = FollowDefinition;
let RemoteInstanceDefinition = {
    "host": "string",
    "name": "string",
    "blocked": "boolean"
};
exports.RemoteInstanceDefinition = RemoteInstanceDefinition;
function createUserTable() {
    return db.dbPool.query(`
        CREATE TABLE users (
           name TEXT PRIMARY KEY NOT NULL,
           password_hashed TEXT NOT NULL,
           password_salt TEXT NOT NULL,
           public_key TEXT NOT NULL,
           private_key TEXT NOT NULL,
           banned BOOL NOT NULL,
           local BOOL NOT NULL,
           last_update bigint,
           foreign_url TEXT NOT NULL
        );
    `).catch((e) => console.log("Error create users table", e));
}
function createNotificationTable() {
    return db.dbPool.query(`
        CREATE TABLE notifications (
           id TEXT PRIMARY KEY NOT NULL,
           recipient TEXT NOT NULL,
           title TEXT NOT NULL,
           content TEXT NOT NULL,
           date bigint,
           read BOOL NOT NULL
        );
    `).catch((e) => console.log("Error create notifications table", e));
}
function createSessionTable() {
    return db.dbPool.query(`
        CREATE TABLE sessions (
           id TEXT PRIMARY KEY NOT NULL,
           user_name TEXT,
           creation_date TEXT NOT NULL
        );
    `).catch((e) => console.log("Error create notifications table", e));
}
function createActivityTable() {
    return db.dbPool.query(`
        CREATE TABLE activitys (
           id TEXT PRIMARY KEY NOT NULL,
           object_id TEXT NOT NULL,
           published bigint NOT NULL,
           author TEXT NOT NULL,
           "to" TEXT[] NOT NULL
        );
    `).catch((e) => console.log("Error create activitys table", e));
}
function createBrancheTable() {
    return db.dbPool.query(`
        CREATE TABLE branches (
           name TEXT PRIMARY KEY NOT NULL,
           creator TEXT NOT NULL,
           description TEXT NOT NULL,
           source_branches TEXT[] NOT NULL,
           pined_threads TEXT[] NOT NULL,
           banned BOOL NOT NULL,
           icon TEXT NOT NULL,
           public_key TEXT NOT NULL,
           private_key TEXT NOT NULL,
           last_update BIGINT NOT NULL
        );
    `).catch((e) => console.log("Error create branches table", e));
}
function createLikeTable() {
    return db.dbPool.query(`
        CREATE TABLE likes (
            id TEXT PRIMARY KEY NOT NULL,
            author TEXT NOT NULL,
            object TEXT NOT NULL
        );
    `).catch((e) => console.log("Error create likes table", e));
}
function createFollowTable() {
    return db.dbPool.query(`
        CREATE TABLE follows (
            id TEXT PRIMARY KEY NOT NULL,
            follower TEXT NOT NULL,
            target TEXT NOT NULL
        );
    `).catch((e) => console.log("Error create follows table", e));
}
function createRemoteInstanceTable() {
    return db.dbPool.query(`
        CREATE TABLE remote_instances (
            host TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            blocked BOOL NOT NULL
        );
    `).catch((e) => console.log("Error create remote_instances table", e));
}
async function listTables() {
    return (await db.query(`
        SELECT
            table_name
        FROM
            information_schema.tables
        WHERE
            table_type = 'BASE TABLE'
        AND
            table_schema NOT IN ('pg_catalog', 'information_schema');
    `)).rows.map((o) => o.table_name);
}
exports.tableMap = {
    "activitys": { constructor: createActivityTable, definition: ActivityDefinition },
    "branches": { constructor: createBrancheTable, definition: BranchDefinition },
    "follows": { constructor: createFollowTable, definition: FollowDefinition },
    "likes": { constructor: createLikeTable, definition: LikeDefinition },
    "notifications": { constructor: createNotificationTable, definition: NotificationDefinition },
    "remote_instances": { constructor: createRemoteInstanceTable, definition: RemoteInstanceDefinition },
    "sessions": { constructor: createSessionTable, definition: SessionDefinition },
    "users": { constructor: createUserTable, definition: UserDefinition }
};
async function createMissingTables() {
    let tableList = await listTables();
    await Promise.all(Object.keys(exports.tableMap).map(async (tableName) => {
        if (tableList.findIndex(x => x == tableName) == -1) { // if the table doesn't exists in the table list
            console.log(`Did not find ${tableName}, creating it.`);
            await exports.tableMap[tableName].constructor();
        }
    }));
}
exports.createMissingTables = createMissingTables;
