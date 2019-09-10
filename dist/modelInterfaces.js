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
const utils = __importStar(require("./utils"));
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
exports.UserDefinition = UserDefinition;
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
exports.NotificationDefinition = NotificationDefinition;
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
exports.SessionDefinition = SessionDefinition;
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
exports.ActivityDefinition = ActivityDefinition;
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
exports.BranchDefinition = BranchDefinition;
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
exports.LikeDefinition = LikeDefinition;
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
exports.FollowDefinition = FollowDefinition;
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
exports.RemoteInstanceDefinition = RemoteInstanceDefinition;
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
exports.LikeBundleDefinition = LikeBundleDefinition;
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
exports.CommentDefinition = CommentDefinition;
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
function createLikeBundleTable() {
    return db.dbPool.query(`
        CREATE TABLE like_bundles (
            server TEXT NOT NULL,
            object TEXT NOT NULL,
            amount BIGINT NOT NULL,
            PRIMARY KEY (server, object)
        );
    `).catch((e) => console.log("Error create remote_instances table", e));
}
function createCommentTable() {
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
    "users": { constructor: createUserTable, definition: UserDefinition },
    "like_bundles": { constructor: createLikeBundleTable, definition: LikeBundleDefinition },
    "comments": { constructor: createCommentTable, definition: CommentDefinition }
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
function columnsOfDefinition(definition) {
    return Object.keys(definition).map(utils.camelToSnakeCase);
}
exports.columnsOfDefinition = columnsOfDefinition;
