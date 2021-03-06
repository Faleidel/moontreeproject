//WARNING, THIS FILE IS COMPUTER GENERATED, PLEASE REFER TO THE HUMAN VERSION AT src/modelInterfaces.mts
import * as db from "./db";
import * as utils from "./utils";


let UserDefinition = {
    "name": {
        "tsType": "string"
    },
    "passwordHashed": {
        "tsType": "string"
    },
    "passwordSalt": {
        "tsType": "string"
    },
    "publicKey": {
        "tsType": "string"
    },
    "privateKey": {
        "tsType": "string"
    },
    "banned": {
        "tsType": "boolean"
    },
    "local": {
        "tsType": "boolean"
    },
    "lastUpdate": {
        "tsType": "number"
    },
    "foreignUrl": {
        "tsType": "string"
    }
};

interface User  {
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
    "id": {
        "tsType": "string"
    },
    "recipient": {
        "tsType": "string"
    },
    "title": {
        "tsType": "string"
    },
    "content": {
        "tsType": "string"
    },
    "date": {
        "tsType": "number"
    },
    "read": {
        "tsType": "boolean"
    }
};

interface Notification  {
    id: string,
    recipient: string,
    title: string,
    content: string,
    date: number,
    read: boolean
}


export {Notification, NotificationDefinition};


let SessionDefinition = {
    "id": {
        "tsType": "string"
    },
    "userName": {
        "tsType": "string | undefined"
    },
    "creationDate": {
        "tsType": "string"
    }
};

interface Session  {
    id: string,
    userName: string | undefined,
    creationDate: string
}


export {Session, SessionDefinition}


let ActivityDefinition = {
    "id": {
        "tsType": "string"
    },
    "objectId": {
        "tsType": "string"
    },
    "published": {
        "tsType": "number"
    },
    "author": {
        "tsType": "string"
    },
    "to": {
        "tsType": "string[]"
    }
};

interface Activity  {
    id: string,
    objectId: string,
    published: number,
    author: string,
    to: string[]
}


export {Activity, ActivityDefinition};


let BranchDefinition = {
    "name": {
        "tsType": "string"
    },
    "creator": {
        "tsType": "string"
    },
    "description": {
        "tsType": "string"
    },
    "sourceBranches": {
        "tsType": "string[]"
    },
    "pinedThreads": {
        "tsType": "string[]"
    },
    "banned": {
        "tsType": "boolean"
    },
    "icon": {
        "tsType": "string"
    },
    "publicKey": {
        "tsType": "string"
    },
    "privateKey": {
        "tsType": "string"
    },
    "lastUpdate": {
        "tsType": "number"
    }
};

interface Branch  {
    name: string,
    creator: string,
    description: string,
    sourceBranches: string[],
    pinedThreads: string[],
    banned: boolean,
    icon: string,
    publicKey: string,
    privateKey: string,
    lastUpdate: number
}


export {Branch, BranchDefinition};


let LikeDefinition = {
    "id": {
        "tsType": "string"
    },
    "author": {
        "tsType": "string"
    },
    "object": {
        "tsType": "string"
    }
};

interface Like  {
    id: string,
    author: string,
    object: string
}


export {Like, LikeDefinition};


let FollowDefinition = {
    "follower": {
        "tsType": "string"
    },
    "target": {
        "tsType": "string"
    },
    "id": {
        "tsType": "string"
    }
};

interface Follow  {
    follower: string,
    target: string,
    id: string
}


export {Follow, FollowDefinition};


let RemoteInstanceDefinition = {
    "host": {
        "tsType": "string"
    },
    "name": {
        "tsType": "string"
    },
    "blocked": {
        "tsType": "boolean"
    }
};

interface RemoteInstance  {
    host: string,
    name: string,
    blocked: boolean
}


export {RemoteInstance, RemoteInstanceDefinition};


let LikeBundleDefinition = {
    "server": {
        "tsType": "string"
    },
    "object": {
        "tsType": "string"
    },
    "amount": {
        "tsType": "number"
    }
};

interface LikeBundle  {
    server: string,
    object: string,
    amount: number
}


export {LikeBundle, LikeBundleDefinition};

export interface CommentTag {
    type: string,
    href: string,
    name: string,
}


let CommentDefinition = {
    "id": {
        "tsType": "string"
    },
    "content": {
        "tsType": "string"
    },
    "published": {
        "tsType": "number"
    },
    "author": {
        "tsType": "string"
    },
    "to": {
        "tsType": "string[]"
    },
    "adminDeleted": {
        "tsType": "boolean"
    },
    "inReplyTo": {
        "tsType": "string | undefined"
    },
    "tags": {
        "dbType": "json",
        "tsType": "CommentTag[]"
    }
};

interface Comment  {
    id: string,
    content: string,
    published: number,
    author: string,
    to: string[],
    adminDeleted: boolean,
    inReplyTo: string | undefined,
    tags: CommentTag[]
}


export {Comment, CommentDefinition};


let ThreadHeaderDefinition = {
    "id": {
        "tsType": "string"
    },
    "title": {
        "tsType": "string"
    },
    "branch": {
        "tsType": "string"
    },
    "isLink": {
        "tsType": "boolean"
    },
    "media": {
        "dbType": "json",
        "tsType": "utils.ExternalMedia | undefined"
    },
    "lastUpdate": {
        "tsType": "number"
    }
};

interface ThreadHeader  {
    id: string,
    title: string,
    branch: string,
    isLink: boolean,
    media: utils.ExternalMedia | undefined,
    lastUpdate: number
}


export {ThreadHeader, ThreadHeaderDefinition};

type Thread = Comment & ThreadHeader;
const ThreadDefinition = { ...CommentDefinition, ...ThreadHeaderDefinition };
export {Thread, ThreadDefinition};


let UrlViewDefinition = {
    "id": {
        "tsType": "string"
    },
    "url": {
        "tsType": "string"
    },
    "time": {
        "tsType": "number"
    },
    "userAgent": {
        "tsType": "string"
    }
};

interface UrlView  {
    id: string,
    url: string,
    time: number,
    userAgent: string
}


export {UrlView, UrlViewDefinition};

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

function createLikeBundleTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE like_bundles (
            server TEXT NOT NULL,
            object TEXT NOT NULL,
            amount BIGINT NOT NULL,
            PRIMARY KEY (server, object)
        );
    `).catch((e: any) => console.log("Error create like_bundles table", e));
}

function createCommentTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE comments (
            id TEXT PRIMARY KEY NOT NULL,
            content TEXT NOT NULL,
            published BIGINT NOT NULL,
            author TEXT NOT NULL,
            "to" TEXT[] NOT NULL,
            admin_deleted BOOL NOT NULL,
            in_reply_to TEXT,
            tags JSON NOT NULL
        );
    `).catch((e: any) => console.log("Error create comment table", e));
}

function createThreadTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE threads (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            branch TEXT NOT NULL,
            is_link BOOL NOT NULL,
            media JSON,
            last_update BIGINT NOT NULL
        );
    `).catch((e: any) => console.log("Error create threads table", e));
}

function createUrlViewTable(): Promise<any> {
    return db.dbPool.query(`
        CREATE TABLE url_view (
            id TEXT PRIMARY KEY NOT NULL,
            url TEXT NOT NULL,
            time BIGINT NOT NULL,
            user_agent TEXT
        );
    `).catch((e: any) => console.log("Error create url view table", e));
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
    definition: {[key: string]: any}
}

export const tableMap: {[key: string]: TableDefinition} = {
    "activitys":        { constructor: createActivityTable,       definition: ActivityDefinition       },
    "branches":         { constructor: createBrancheTable,        definition: BranchDefinition         },
    "follows":          { constructor: createFollowTable,         definition: FollowDefinition         },
    "likes":            { constructor: createLikeTable,           definition: LikeDefinition           },
    "notifications":    { constructor: createNotificationTable,   definition: NotificationDefinition   },
    "remote_instances": { constructor: createRemoteInstanceTable, definition: RemoteInstanceDefinition },
    "sessions":         { constructor: createSessionTable,        definition: SessionDefinition        },
    "users":            { constructor: createUserTable,           definition: UserDefinition           },
    "like_bundles":     { constructor: createLikeBundleTable,     definition: LikeBundleDefinition     },
    "comments":         { constructor: createCommentTable,        definition: CommentDefinition        },
    "threads":          { constructor: createThreadTable,         definition: ThreadHeaderDefinition   },
    "url_view":         { constructor: createUrlViewTable,        definition: UrlViewDefinition        }
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

export function columnsOfDefinition(definition: any): string[] {
    return Object.keys(definition).map(utils.camelToSnakeCase);
}
