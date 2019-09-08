import * as db from "./db";

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

meta interface Branch {
    name: "string",
    creator: "string",
    description: "string",
    sourceBranches: "string[]",
    pinedThreads: "string[]",
    banned: "boolean",
    icon: "string",
     
    publicKey: "string",
    privateKey: "string",
    
    lastUpdate: "number"
} end meta interface
export {Branch, BranchDefinition};

meta interface Like {
    id: "string",
    author: "string",
    object: "string"
} end meta interface
export {Like, LikeDefinition};

meta interface Follow {
    follower: "string",
    target: "string",
    id: "string"
} end meta interface
export {Follow, FollowDefinition};

meta interface RemoteInstance {
    host: "string",
    name: "string",
    blocked: "boolean"
} end meta interface
export {RemoteInstance, RemoteInstanceDefinition};

function createUserTable(): Promise<any> {
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
    `).catch((e: any) => console.log("Error create users table", e));
}

function createNotificationTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE notifications (
           id TEXT PRIMARY KEY NOT NULL,
           recipient TEXT NOT NULL,
           title TEXT NOT NULL,
           content TEXT NOT NULL,
           date bigint,
           read BOOL NOT NULL
        );
    `).catch((e: any) => console.log("Error create notifications table", e));
}

function createSessionTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE sessions (
           id TEXT PRIMARY KEY NOT NULL,
           user_name TEXT,
           creation_date TEXT NOT NULL
        );
    `).catch((e: any) => console.log("Error create notifications table", e));
}

function createActivityTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE activitys (
           id TEXT PRIMARY KEY NOT NULL,
           object_id TEXT NOT NULL,
           published bigint NOT NULL,
           author TEXT NOT NULL,
           "to" TEXT[] NOT NULL
        );
    `).catch((e: any) => console.log("Error create activitys table", e));
}

function createBrancheTable(): Promise<any> {
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
    `).catch((e: any) => console.log("Error create branches table", e));
}

function createLikeTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE likes (
            id TEXT PRIMARY KEY NOT NULL,
            author TEXT NOT NULL,
            object TEXT NOT NULL
        );
    `).catch((e: any) => console.log("Error create likes table", e));
}

function createFollowTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE follows (
            id TEXT PRIMARY KEY NOT NULL,
            follower TEXT NOT NULL,
            target TEXT NOT NULL
        );
    `).catch((e: any) => console.log("Error create follows table", e));
}

function createRemoteInstanceTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE remote_instances (
            host TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            blocked BOOL NOT NULL
        );
    `).catch((e: any) => console.log("Error create remote_instances table", e));
}

async function listTables(): Promise<string[]> {
    return (await db.query(`
        SELECT
            table_name
        FROM
            information_schema.tables
        WHERE
            table_type = 'BASE TABLE'
        AND
            table_schema NOT IN ('pg_catalog', 'information_schema');
    `)).rows.map((o: any) => o.table_name as string);
}

interface TableDefinition {
    constructor: () => Promise<void>,
    definition: any
}

export const tableMap: {[key: string]: TableDefinition} = {
    "activitys":        { constructor: createActivityTable,       definition: ActivityDefinition       },
    "branches":         { constructor: createBrancheTable,        definition: BranchDefinition         },
    "follows":          { constructor: createFollowTable,         definition: FollowDefinition         },
    "likes":            { constructor: createLikeTable,           definition: LikeDefinition           },
    "notifications":    { constructor: createNotificationTable,   definition: NotificationDefinition   },
    "remote_instances": { constructor: createRemoteInstanceTable, definition: RemoteInstanceDefinition },
    "sessions":         { constructor: createSessionTable,        definition: SessionDefinition        },
    "users":            { constructor: createUserTable,           definition: UserDefinition           }
};

export async function createMissingTables(): Promise<void> {
    let tableList = await listTables();
    
    await Promise.all(Object.keys(tableMap).map(async (tableName) => {
        if (tableList.findIndex(x => x == tableName) == -1) { // if the table doesn't exists in the table list
            console.log(`Did not find ${tableName}, creating it.`);
            await tableMap[tableName].constructor();
        }
    }));
}
