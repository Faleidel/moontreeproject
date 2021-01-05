"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const utils = __importStar(require("./utils"));
const crypto = __importStar(require("crypto"));
const urlLib = __importStar(require("url"));
const request = require("request");
const cache = __importStar(require("./cache"));
const { Pool } = require('pg');
const modelInterfaces_1 = require("./modelInterfaces");
exports.UserDefinition = modelInterfaces_1.UserDefinition;
exports.NotificationDefinition = modelInterfaces_1.NotificationDefinition;
exports.SessionDefinition = modelInterfaces_1.SessionDefinition;
exports.ActivityDefinition = modelInterfaces_1.ActivityDefinition;
exports.BranchDefinition = modelInterfaces_1.BranchDefinition;
exports.LikeDefinition = modelInterfaces_1.LikeDefinition;
exports.FollowDefinition = modelInterfaces_1.FollowDefinition;
exports.RemoteInstanceDefinition = modelInterfaces_1.RemoteInstanceDefinition;
exports.LikeBundleDefinition = modelInterfaces_1.LikeBundleDefinition;
exports.CommentDefinition = modelInterfaces_1.CommentDefinition;
exports.ThreadDefinition = modelInterfaces_1.ThreadDefinition;
exports.ThreadHeaderDefinition = modelInterfaces_1.ThreadHeaderDefinition;
const modelInterfaces = __importStar(require("./modelInterfaces"));
const db = __importStar(require("./db"));
const protocol = __importStar(require("./protocol"));
async function activityToJSON(act) {
    let object = typeof act.object == "object"
        ? act.object
        : await getThreadById(act.objectId) || await getCommentById(act.objectId);
    let user = await getUserByName(act.author);
    if (object && user) {
        let media = object.media;
        try {
            return {
                "@context": [
                    "https://www.w3.org/ns/activitystreams",
                    "https://w3id.org/security/v1"
                ],
                id: act.id,
                type: "Create",
                to: act.to,
                cc: await getFollowersByActor(utils.urlForPath('user/' + user.name)),
                published: new Date(act.published).toISOString(),
                actor: utils.urlForPath("user/" + act.author),
                object: {
                    type: "Note",
                    id: object.id,
                    url: object.id,
                    attachment: !media ? [] : [utils.externalMediaToAttachment(media)],
                    attributedTo: act.author,
                    actor: utils.urlForPath("user/" + act.author),
                    to: object.to,
                    cc: await getFollowersByActor(utils.urlForPath('user/' + user.name)),
                    inReplyTo: object.inReplyTo,
                    title: object.title,
                    content: object.content,
                    published: new Date(object.published).toISOString(),
                    sensitive: false,
                    summary: null,
                    tag: object.tags
                }
            };
        }
        catch (e) {
            console.log("Error creating JSON from activity", act, e);
            throw (new Error("Error creating JSON from activity"));
        }
    }
    else
        return undefined;
}
exports.activityToJSON = activityToJSON;
async function createAnnounce(actorUrl, objectUrl) {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: utils.urlForPath("announce") + "/" + Math.random() * 1000000000000,
        type: "Announce",
        actor: actorUrl,
        published: new Date().toISOString(),
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: await getFollowersByActor(actorUrl),
        object: objectUrl
    };
}
exports.createAnnounce = createAnnounce;
async function commentToJSON(comment) {
    let media = comment.media;
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: comment.id,
        url: comment.id,
        type: "Note",
        to: comment.to,
        cc: [],
        published: new Date(comment.published).toISOString(),
        attributedTo: utils.urlForUser(comment.author),
        actor: utils.urlForUser(comment.author),
        inReplyTo: comment.inReplyTo,
        content: comment.content,
        attachment: !media ? [] : [utils.externalMediaToAttachment(media)],
        sensitive: false,
        summary: null,
        likes: await getRemoteLikesAmount(comment) + (await getLikesByObject(comment)),
        tag: comment.tags
    };
}
exports.commentToJSON = commentToJSON;
async function commentFromJSON(json) {
    return {
        id: json.id,
        content: json.content,
        published: json.published,
        author: json.attributedTo,
        to: json.to,
        inReplyTo: json.inReplyTo,
        tags: json.tag,
        adminDeleted: false
    };
}
exports.commentFromJSON = commentFromJSON;
async function threadToJSON(thread) {
    let result = Object.assign({}, await commentToJSON(thread), { "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1" //,
            //"ironTreeThread"
        ], title: thread.title, branch: thread.branch.indexOf("@") == -1 ? thread.branch + "@" + utils.serverAddress() : thread.branch.split("@")[0], isLink: thread.isLink, media: thread.media, likes: await getRemoteLikesAmount(thread) + (await getLikesByObject(thread)) });
    result.content = utils.renderMarkdown("# " + result.title + "\n" + result.content);
    return result;
}
exports.threadToJSON = threadToJSON;
async function threadFromJSON(json) {
    let comment = await commentFromJSON(json);
    if (comment && json.isLink != undefined && json.branch != undefined)
        return Object.assign({}, comment, { title: json.title, branch: json.branch, isLink: json.isLink, media: json.media, adminDeleted: false, lastUpdate: new Date().getTime() });
    else
        return undefined;
}
exports.threadFromJSON = threadFromJSON;
async function branchToJSON(branch) {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: utils.urlForBranch(branch),
        type: "Person",
        preferredUsername: branch.name + "@" + utils.host(),
        inbox: utils.urlForBranch(branch) + "/inbox",
        outbox: utils.urlForBranch(branch) + "/outbox",
        icon: {
            type: "Image",
            mediaType: "image/png",
            url: branch.icon
        },
        publicKey: {
            id: utils.urlForBranch(branch) + "#main-key",
            owner: utils.urlForBranch(branch),
            publicKeyPem: branch.publicKey
        }
    };
}
exports.branchToJSON = branchToJSON;
async function branchPostsToJSON(branch) {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        type: "OrderedCollection",
        first: utils.urlForBranch(branch) + "/outbox/?page=0",
        last: utils.urlForBranch(branch) + "/outbox/?page=10000",
        id: utils.urlForBranch(branch),
        totalItems: 1000,
        name: utils.renderQualifiedName(utils.parseQualifiedName(branch.name)),
        creator: utils.renderQualifiedName(utils.parseQualifiedName(branch.creator)),
        pinedThreads: branch.pinedThreads,
        description: branch.description
    };
}
exports.branchPostsToJSON = branchPostsToJSON;
async function branchFromJSON(obj) {
    return {
        name: obj.name,
        creator: obj.creator,
        description: obj.description,
        following: [],
        pinedThreads: obj.pinedThreads,
        lastUpdate: new Date().getTime(),
        icon: "",
        publicKey: "",
        privateKey: "",
        banned: false
    };
}
exports.branchFromJSON = branchFromJSON;
exports.store = {
    "activitys": [],
    "comments": [],
    "threads": [],
    "follows": [],
    "branches": [],
    "users": [],
    "notifications": [],
    "sessions": [],
    "likes": [],
    "remoteInstances": [],
    "likeBundles": []
}; // not used anymore
async function testLikeOn(comment, amount) {
    for (let i = 0; i < amount; i++) {
        let user = await getUserByName("test" + i + "@" + utils.serverAddress());
        if (user) {
            let l = await createLike(user, comment);
            console.log(l);
        }
        else {
            console.log("bad user");
        }
    }
}
async function loadStore() {
    console.log("Loading JSON store...", utils.migrationNumber);
    if (utils.migrationNumber == 1) {
        utils.log("Migration is 1, migrating to 2");
        // change activitys publish date from string format to timestamp
        Object.values(exports.store.activitys).map((act) => {
            act.published = new Date(act.published).getTime();
        });
        Object.values(exports.store.comments).map(act => {
            act.published = new Date(act.published).getTime();
        });
        Object.values(exports.store.threads).map(act => {
            act.published = new Date(act.published).getTime();
        });
        saveStore();
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 2) {
        saveStore();
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 3) {
        exports.store.follows = {};
        saveStore();
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 4) {
        await Promise.all(Object.values(exports.store.branches).map(async (branch) => {
            let kp = await utils.generateUserKeyPair();
            branch.privateKey = kp.privateKey;
            branch.publicKey = kp.publicKey;
        }));
        saveStore();
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 5) {
        Object.values(exports.store.branches).map(branch => {
            branch.icon = "";
        });
        saveStore();
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 6) {
        const dbPoolPG = new Pool({
            user: utils.config.database.user,
            host: utils.config.database.host,
            database: "postgres",
            password: utils.config.database.password,
            port: utils.config.database.port
        });
        await dbPoolPG.query(`CREATE DATABASE ${utils.config.database.database};`)
            .then(() => utils.log("Created database " + utils.config.database.database))
            .catch(() => utils.log("Database " + utils.config.database.database + " already existed"));
        dbPoolPG.end();
        db.setDbPool();
        await Promise.all(Object.keys(exports.store.users).map(async (userName) => {
            console.log("Insert user", userName);
            let user = exports.store.users[userName];
            await insertUser(user)
                .catch((e) => console.log("Error adding user to userse table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    await db.dbReady;
    await modelInterfaces.createMissingTables()
        .catch(async (e) => {
        const dbPoolPG = new Pool({
            user: utils.config.database.user,
            host: utils.config.database.host,
            database: "postgres",
            password: utils.config.database.password,
            port: utils.config.database.port
        });
        await dbPoolPG.query(`CREATE DATABASE ${utils.config.database.database};`)
            .then(() => utils.log("Created database " + utils.config.database.database))
            .catch(() => utils.log("Database " + utils.config.database.database + " already existed"));
        dbPoolPG.end();
        db.setDbPool();
        await modelInterfaces.createMissingTables();
    });
    if (utils.migrationNumber == 7) {
        await Promise.all(Object.keys(exports.store.notifications).map(async (notifId) => {
            let notif = exports.store.notifications[notifId];
            await insertNotification(notif)
                .catch((e) => console.log("Error adding notification to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 8) {
        await Promise.all(Object.keys(exports.store.sessions).map(async (sessionId) => {
            let session = exports.store.sessions[sessionId];
            await insertSession(session)
                .catch((e) => console.log("Error adding session to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 9) {
        await Promise.all(Object.keys(exports.store.activitys).map(async (actId) => {
            let activity = exports.store.activitys[actId];
            await insertActivity(activity)
                .catch((e) => console.log("Error adding activity to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 10) {
        await Promise.all(Object.keys(exports.store.branches).map(async (branchId) => {
            let branch = exports.store.branches[branchId];
            await insertBranch(branch)
                .catch((e) => console.log("Error adding branch to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 11) {
        await Promise.all(Object.keys(exports.store.likes).map(async (likeId) => {
            let like = exports.store.likes[likeId];
            await insertLike(like)
                .catch((e) => console.log("Error adding like to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 12) {
        await Promise.all(Object.keys(exports.store.follows).map(async (followId) => {
            let follow = exports.store.follows[followId];
            await insertFollow(follow)
                .catch((e) => console.log("Error adding follow to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 13) {
        await Promise.all(Object.keys(exports.store.remoteInstances).map(async (remoteId) => {
            let remoteInstance = exports.store.remoteInstances[remoteId];
            await insertRemoteInstance(remoteInstance)
                .catch((e) => console.log("Error adding remoteInstance to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 14) {
        await Promise.all(Object.keys(exports.store.likeBundles).map(async (id) => {
            let bundle = exports.store.likeBundles[id];
            await insertLikeBundle(bundle)
                .catch((e) => console.log("Error adding like bundle to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 15) {
        await Promise.all(Object.keys(exports.store.comments).map(async (id) => {
            let comment = exports.store.comments[id];
            comment.tags = comment.tags || []; //to fix a bug, lot's of comment's don't have tags but the field is mendatory
            await exports.insertComment(comment)
                .catch((e) => console.log("Error adding comment bundle to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 16) {
        await Promise.all(Object.keys(exports.store.threads).map(async (id) => {
            let thread = exports.store.threads[id];
            thread.tags = thread.tags || []; //to fix a bug, lot's of comment's don't have tags but the field is mendatory
            await insertThread(thread)
                .catch((e) => console.log("Error adding thread bundle to table", e));
        }));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 17) {
        await db.query(`
            ALTER TABLE url_view
            ADD COLUMN user_agent text;
        `).catch(e => console.log(e));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    if (utils.migrationNumber == 18) {
        await db.query(`
            ALTER TABLE branches
            DROP COLUMN source_branches;
        `).catch((e) => console.log(e));
        await db.query(`
            ALTER TABLE branches
            ADD COLUMN following text[];
        `).catch((e) => console.log(e));
        utils.setMigrationNumber(utils.migrationNumber + 1);
    }
    // test code to generate random comments tree for a thread
    //    let user = await getUserByName("test0@192.168.117.101:9090");
    //    let ids = [Object.values(store.threads)[Math.floor(Math.random()* threadLength)].id];
    //    if (user) {
    //        for (let x = 0 ; x < 0 ; x++) {
    //            let comment = await createComment(user, Math.random() + "", ids[Math.floor(Math.random() * ids.length)]);
    //            ids.push(comment.id);
    //        }
    //    }
    console.log("Finised loading, migrating and indexing JSON store");
    if (false) {
        (async () => {
            if (utils.generateTestData) {
                console.log("Generating test datas");
                let admin = await createUser("admin", "admin");
                let admin2 = await createUser("admin2", "admin2");
                utils.setAdmins(["admin@" + utils.serverAddress(), "admin2@" + utils.serverAddress()]);
                for (let i = 0; i < 20; i++)
                    await createUser("test" + i, "test" + i);
                await createBranch("gold", "This is the gold branch", [], admin);
                await createBranch("silver", "This is the silver branch", [], admin2);
                await createBranch("iron", "This is the iron branch", [], await getUserByName("test1@" + utils.serverAddress()));
                await createBranch("test", "This is the test branch", [], admin);
                let randomBranch = () => ["gold", "silver", "iron"][Math.floor(Math.random() * 3)];
                for (let i = 0; i < 20; i++) {
                    let { thread } = await createThread(admin, "test thread" + i, "With no content", randomBranch());
                    thread.published -= Math.floor(1000 * 60 * 60 * 24 * 5 * Math.random());
                }
                await (async () => {
                    for (let tid in exports.store.threads) {
                        let c = await getThreadById(tid);
                        if (c)
                            await testLikeOn(c, Math.floor(Math.random() * 5));
                        else
                            console.log("Bad thread", c);
                    }
                })();
            }
            saveStore();
            console.log("Generate new store");
        })();
    }
}
exports.loadStore = loadStore;
let saveTimeout = undefined;
function saveStore() {
    if (!saveTimeout) {
        saveTimeout = setTimeout(() => {
            fs.writeFile("store.json", JSON.stringify(exports.store, undefined, 4), () => { });
            saveTimeout = undefined;
        }, 2000);
    }
}
exports.saveStore = saveStore;
// LIKE
const insertLike = db.insertForType("likes", modelInterfaces_1.LikeDefinition);
async function createLike(author, object) {
    // TODO
    let alreadyLiked = !!(await db.getObjectWhere("likes", {
        author: author.name,
        object: object.id
    }));
    if (alreadyLiked) {
        return undefined;
    }
    else {
        let like = {
            id: Math.random() * 100000000000000000 + "",
            author: author.name,
            object: object.id
        };
        await insertLike(like);
        return like;
    }
}
exports.createLike = createLike;
async function deleteLikeOfOn(actor, object) {
    db.deleteWhere("likes", { author: actor.name, object: object.id });
}
exports.deleteLikeOfOn = deleteLikeOfOn;
exports.getLikeById = db.getObjectByField("likes", "id");
async function getLikesByObject(object) {
    return db.countObjectsWhere("likes", {
        object: object.id
    });
}
exports.getLikesByObject = getLikesByObject;
async function hasActorLiked(actor, object) {
    return !!(await db.getObjectWhere("likes", {
        author: actor.name,
        object: object.id
    }));
}
exports.hasActorLiked = hasActorLiked;
// LIKEBUNDLE
const insertLikeBundle = db.insertForType("like_bundles", modelInterfaces_1.LikeBundleDefinition);
async function createOrUpdateLikeBundle(server, object, amount) {
    let pastBundle = await db.getObjectWhere("like_bundles", {
        server: server,
        object: object.id
    });
    if (pastBundle) {
        await db.updateFieldsWhere("like_bundles", {
            server: server,
            object: object.id
        }, {
            amount: amount
        });
    }
    else {
        let bundle = {
            server: server,
            object: object.id,
            amount: amount
        };
        await insertLikeBundle(bundle);
        return bundle;
    }
}
exports.createOrUpdateLikeBundle = createOrUpdateLikeBundle;
async function getRemoteLikesAmount(object) {
    return parseInt((await db.query(`
        SELECT SUM(amount)
        FROM like_bundles
        WHERE object = '${object.id}'
    `)).rows[0].sum || 0, 10);
}
exports.getRemoteLikesAmount = getRemoteLikesAmount;
// USER
const queryUserByName = db.getObjectByField("users", "name");
exports.getUserList = db.getAllFrom("users");
const insertUser = db.insertForType("users", modelInterfaces_1.UserDefinition);
async function banUser(name) {
    await db.updateFieldsWhere("users", { name: name }, { banned: true });
}
exports.banUser = banUser;
async function getUserByName(name) {
    let user = await queryUserByName(name);
    if (user) {
        if (user.local)
            return user;
        else {
            if (new Date().getTime() - user.lastUpdate > (1000 * 60 * 60)) {
                user.lastUpdate = new Date().getTime();
                console.log("UPDATE USER DATA");
                await importForeignUserData(name);
            }
            return user;
        }
    }
    else {
        if (name.indexOf("@" + utils.serverAddress()) == -1) {
            if (name.indexOf("@") == -1)
                return await getUserByName(name + "@" + utils.serverAddress());
            else {
                console.log("GET NEW FOREIGN USER");
                return await getForeignUser(name);
            }
        }
        else
            return undefined;
    }
}
exports.getUserByName = getUserByName;
async function getForeignUser(name) {
    let domain = name.split("@")[1];
    let remoteInstance = await getRemoteInstanceByHost(domain);
    if (remoteInstance && !remoteInstance.blocked) {
        let userLink = await utils.request({
            methode: "GET",
            url: utils.protocol() + "://" + domain + "/.well-known/webfinger?resource=acct:" + name,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            let json = JSON.parse(datas.body);
            if (json.links && json.links.find((e) => e.rel == "self")) {
                return json.links.find((e) => e.rel == "self").href;
            }
            else
                throw ("Bad json data");
        });
        let newUser = {
            name: name,
            passwordHashed: "",
            passwordSalt: "",
            publicKey: "",
            privateKey: "",
            local: false,
            lastUpdate: new Date().getTime(),
            foreignUrl: userLink,
            banned: false
        };
        await insertUser(newUser);
        await importForeignUserData(name);
        return newUser;
    }
}
exports.getForeignUser = getForeignUser;
async function importForeignUserData(name) {
    console.log("Importing user data:", name);
    let user = await getUserByName(name);
    if (user && !user.local) {
        let userInfos = await utils.request({
            url: user.foreignUrl,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            let json = JSON.parse(datas.body);
            return {
                outbox: json.outbox
            };
        });
        let actsPageUrl = await utils.request({
            url: userInfos.outbox,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            return JSON.parse(datas.body).first;
        });
        let acts = await utils.request({
            url: actsPageUrl,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            return JSON.parse(datas.body);
        });
        let activitys = acts.orderedItems.filter((act) => typeof act.object != "string");
        activitys.map((act) => act.object.content = act.object.content.replace(/<(?:.|\n)*?>/gm, ''));
        activitys.map(async (act) => {
            let exists = await exports.getActivityById(act.id);
            if (!exists) {
                let comment = {
                    id: act.object.id,
                    content: act.object.content,
                    published: new Date(act.object.published).getTime(),
                    author: name,
                    to: act.object.to,
                    inReplyTo: act.object.inReplyTo,
                    tags: act.object.tag,
                    adminDeleted: false
                };
                let activity = {
                    id: act.id,
                    objectId: act.object.id,
                    published: new Date(act.published).getTime(),
                    author: name,
                    to: act.to
                };
                await exports.insertComment(comment);
                await insertActivity(activity);
            }
        });
    }
}
exports.importForeignUserData = importForeignUserData;
async function createUser(name, password) {
    name = name + "@" + utils.serverAddress();
    let user = await getUserByName(name);
    let branch = await getBranchByName(name);
    utils.alertLog("userCreation", `Creating User ${name}`);
    // Can't create the user if it already exists (same namespace as branches)
    if (!user && !branch) {
        let passwordSalt = await (new Promise((resolve, reject) => {
            crypto.randomBytes(512, (err, buf) => {
                if (err)
                    reject();
                else
                    resolve(buf.toString("hex"));
            });
        }));
        let passwordHashed = await utils.hashPassword(password, passwordSalt);
        let u = await utils.generateUserKeyPair().then(async (kp) => {
            let user = {
                name: name,
                passwordHashed: passwordHashed,
                passwordSalt: passwordSalt,
                publicKey: kp.publicKey,
                privateKey: kp.privateKey,
                local: true,
                lastUpdate: 0,
                foreignUrl: "",
                banned: false
            };
            await insertUser(user);
            return user;
        });
        return u;
    }
    else {
        return Promise.resolve(undefined);
    }
}
exports.createUser = createUser;
// NOTIFICATION
const insertNotification = db.insertForType("notifications", modelInterfaces_1.NotificationDefinition);
async function createNotification(recipient, title, content) {
    let notif = {
        id: Math.random() * 100000000000000000 + "",
        recipient: recipient.name,
        title: title,
        content: content,
        date: new Date().getTime(),
        read: false
    };
    await insertNotification(notif);
    return notif;
}
exports.createNotification = createNotification;
exports.getNotificationById = db.getObjectByField("notifications", "id");
async function getNotificationsByUserId(recipient) {
    return (await db.query(`
        SELECT * FROM notifications
        WHERE recipient = $1
        ORDER BY date DESC
    `, [recipient]))
        .rows.map((r) => db.fromDBObject(r, modelInterfaces_1.NotificationDefinition));
}
exports.getNotificationsByUserId = getNotificationsByUserId;
exports.getNotificationsByUser = function (user) {
    return getNotificationsByUserId(user.name);
};
async function getNotificationCountByUser(recipient) {
    return (await exports.getNotificationsByUser(recipient)).filter(n => !n.read).length;
}
exports.getNotificationCountByUser = getNotificationCountByUser;
async function setNotificationRead(notification) {
    await db.updateFieldsWhere("notifications", { id: notification.id }, { read: true });
}
exports.setNotificationRead = setNotificationRead;
// BRANCH
exports.queryBranchByName = db.getObjectByField("branches", "name");
const insertBranch = db.insertForType("branches", modelInterfaces_1.BranchDefinition);
async function getBranchByName(name) {
    let branch = await exports.queryBranchByName(name);
    let qName = utils.parseQualifiedName(name);
    if (!branch) {
        if (!qName.isOwn) {
            let branchJson = await getRemoteBranchJSON(name);
            if (branchJson) {
                let mBranch = await branchFromJSON(branchJson);
                if (mBranch) {
                    branch = mBranch;
                    await insertBranch(branch);
                    await fetchRemoteBranchThreads(name);
                }
            }
            return branch;
        }
        else {
            return await exports.queryBranchByName(qName.name);
        }
    }
    else {
        if (!qName.isOwn && new Date().getTime() - branch.lastUpdate > (1000 * 60 * 2)) {
            branch.lastUpdate = new Date().getTime();
            await fetchRemoteBranchThreads(name);
        }
        if (branch.banned)
            return undefined;
        else
            return branch;
    }
}
exports.getBranchByName = getBranchByName;
async function isBranchBanned(name) {
    return !(await getBranchByName(name));
}
exports.isBranchBanned = isBranchBanned;
async function banBranch(name) {
    await db.updateFieldsWhere("branches", { name: name }, { banned: true });
}
exports.banBranch = banBranch;
async function getRemoteBranchJSON(name) {
    let qName = utils.parseQualifiedName(name);
    let remoteInstance = await getRemoteInstanceByHost(qName.host);
    if (remoteInstance && !remoteInstance.blocked) {
        return await utils.request({
            method: "GET",
            url: utils.protocol() + "://" + qName.host + "/branch/" + qName.name,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            let json = JSON.parse(datas.body);
            return json;
        }).catch(e => undefined);
    }
}
exports.getRemoteBranchJSON = getRemoteBranchJSON;
async function fetchRemoteBranchThreads(name) {
    let branchJson = await getRemoteBranchJSON(name);
    if (branchJson) {
        let mBranch = await branchFromJSON(branchJson);
        if (mBranch) {
            let pageUrl = branchJson.first;
            for (let i = 0; i < 10 && pageUrl; i++) {
                let datas = await utils.request({
                    method: "GET",
                    url: pageUrl,
                    headers: { "Accept": "application/json" }
                });
                let page = JSON.parse(datas.body);
                await Promise.all(page.orderedItems.map(async (threadJSON) => {
                    let thread = await threadFromJSON(threadJSON);
                    if (thread) {
                        await insertThread(thread);
                        let { host } = urlLib.parse(thread.id);
                        await createOrUpdateLikeBundle(host, thread, threadJSON.likes);
                    }
                }));
                pageUrl = page.next;
            }
        }
    }
}
exports.fetchRemoteBranchThreads = fetchRemoteBranchThreads;
async function createBranch(name, description, sourceBranches, creator) {
    let exists = await getBranchByName(name);
    let existsUser = await getUserByName(name);
    if (exists || existsUser) {
        return undefined;
    }
    else {
        let kp = await utils.generateUserKeyPair();
        let branch = {
            name: name,
            description: description,
            creator: creator.name,
            following: sourceBranches,
            pinedThreads: [],
            banned: false,
            icon: "",
            publicKey: kp.publicKey,
            privateKey: kp.privateKey,
            lastUpdate: 0 // only for remote branches
        };
        utils.alertLog("branchCreation", `User ${creator.name} create branch ${name} with description ${description}`);
        await insertBranch(branch);
        return branch;
    }
}
exports.createBranch = createBranch;
async function setBranchIcon(branch, iconPath) {
    await db.updateFieldsWhere("branches", { name: branch.name }, { icon: iconPath });
}
exports.setBranchIcon = setBranchIcon;
async function isBranchAdmin(user, branch) {
    if (!user)
        return false;
    else
        return branch.creator == user.name;
}
exports.isBranchAdmin = isBranchAdmin;
async function setBranchPinedThreads(branch, pinedThreads) {
    await db.updateFieldsWhere("branches", { name: branch.name }, { pinedThreads: pinedThreads });
}
exports.setBranchPinedThreads = setBranchPinedThreads;
async function updateBranchFollowing(branch, following) {
    let original = await getBranchByName(branch.name);
    if (original) {
        let newFollowing = following.filter(f => !original.following.some(x => x == f));
        // save new info
        await db.updateFieldsWhere("branches", { name: branch.name }, { following: following });
        //send new following subscription
        for (let follow of newFollowing) {
            await protocol.sendSignedRequest(follow, await protocol.createFollowRequest("https://moontreeproject.org/branch/" + branch.name, follow), branch.privateKey, utils.urlForBranch(branch) + "#main-key");
        }
    }
}
exports.updateBranchFollowing = updateBranchFollowing;
async function unsafeBranchList() {
    return (await db.getAllFrom("branches")()).filter(b => !b.banned);
}
exports.unsafeBranchList = unsafeBranchList;
// SESSION
exports.getSessionById = db.getObjectByField("sessions", "id");
const insertSession = db.insertForType("sessions", modelInterfaces_1.SessionDefinition);
async function createSession() {
    let session = {
        id: Math.random() * 100000000000000000 + "",
        userName: undefined,
        creationDate: new Date().toUTCString()
    };
    await insertSession(session);
    return session;
}
exports.createSession = createSession;
async function deleteSession(session) {
    // TODO
    db.deleteWhere("sessions", { id: session.id });
}
exports.deleteSession = deleteSession;
async function loginSession(session, user) {
    await db.updateFieldsWhere("sessions", { id: session.id }, { userName: user.name });
}
exports.loginSession = loginSession;
// ACTIVITY
exports.getActivityById = db.getObjectByField("activitys", "id");
const insertActivity = db.insertForType("activitys", modelInterfaces_1.ActivityDefinition);
async function createActivity(author, object) {
    let activity = {
        id: utils.urlForPath("activity/" + (Math.random() * 100000000000000000)),
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        objectId: object.id
    };
    await insertActivity(activity);
    return activity;
}
exports.createActivity = createActivity;
exports.getActivitysByAuthor = db.getObjectsByField("activitys", "author");
// COMMENTS
exports.queryCommentById = db.getObjectByField("comments", "id");
exports.insertComment = db.insertForType("comments", modelInterfaces_1.CommentDefinition);
async function getCommentById(id) {
    let comment = await exports.queryCommentById(id);
    if (comment && comment.adminDeleted)
        return undefined;
    else
        return comment;
}
exports.getCommentById = getCommentById;
async function createComment(author, content, inReplyTo) {
    let comment = {
        id: utils.urlForPath("comment/" + utils.intToBase64(Math.random() * 100000000000000000)),
        content: content,
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        inReplyTo: inReplyTo,
        tags: [],
        adminDeleted: false
    };
    if (inReplyTo.split("/")[2] != utils.serverAddress()) { // send comment to remote server
        let remoteHost = utils.protocol() + "://" + inReplyTo.split("/")[2] + "/inbox";
        let jsonComment = JSON.stringify(await commentToJSON(comment));
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err, resp, body) => {
            console.log("Answer from remote inbox", err, body);
        });
    }
    else { // create notification to local user
        let objectT = await getThreadById(inReplyTo);
        let objectC = await getCommentById(inReplyTo);
        let object = objectT || objectC;
        if (object) {
            let recipient = await getUserByName(object.author);
            if (recipient) {
                let link = "## [comment link](" + comment.id + ")";
                await createNotification(recipient, "New message from " + author.name, link + "\n\n" + content);
            }
        }
    }
    await exports.insertComment(comment);
    return comment;
}
exports.createComment = createComment;
async function updateComment(comment, content) {
    await db.updateFieldsWhere("comments", {
        id: comment.id
    }, {
        content: content
    });
}
exports.updateComment = updateComment;
async function getCommentsByAuthor(userName) {
    return await db.getObjectsWhere("comments", {
        author: userName
    });
}
exports.getCommentsByAuthor = getCommentsByAuthor;
async function adminDeleteComment(id) {
    await db.updateFieldsWhere("comments", {
        id: id
    }, {
        admin_deleted: true
    });
}
exports.adminDeleteComment = adminDeleteComment;
// THREAD
exports.insertThreadHeader = db.insertForType("threads", modelInterfaces_1.ThreadHeaderDefinition);
async function insertThread(thread) {
    await exports.insertThreadHeader(thread);
    await exports.insertComment(thread);
}
exports.insertThread = insertThread;
function isOwnThread(id) {
    let qName = utils.parseQualifiedName(id);
    return qName.isOwn;
}
exports.isOwnThread = isOwnThread;
async function queryThreadById(id) {
    let obj = (await db.query(`
        SELECT *
        FROM threads
        INNER JOIN comments ON comments.id = threads.id
        WHERE threads.id = $1
    `, [id])).rows[0];
    if (obj)
        return db.fromDBObject(obj, modelInterfaces_1.ThreadDefinition);
    else
        return;
}
exports.queryThreadById = queryThreadById;
async function getThreadById(id) {
    let thread = await queryThreadById(id);
    if (!isOwnThread(id) && (!thread || (thread && new Date().getTime() - thread.lastUpdate > 1000 * 60 * 10))) {
        thread = await ((async () => {
            let threadUrl = id;
            let { resp, body } = await utils.request({
                method: "GET",
                url: threadUrl,
                headers: {
                    Accept: "application/json"
                }
            });
            let threadJson = JSON.parse(body);
            let newThread = await threadFromJSON(threadJson);
            if (newThread) {
                newThread.lastUpdate = new Date().getTime();
                await insertThread(newThread);
                let { host } = urlLib.parse(newThread.id);
                await createOrUpdateLikeBundle(host, newThread, threadJson.likes);
                await Promise.all(threadJson.childrens.map(async (c) => {
                    let comment = await commentFromJSON(c);
                    if (comment) {
                        await exports.insertComment(comment);
                        let { host } = urlLib.parse(comment.id);
                        await createOrUpdateLikeBundle(host, comment, c.likes);
                    }
                }));
                return await getThreadById(threadUrl);
            }
        })().catch((e) => { console.log(e); return undefined; }));
    }
    if (thread && ((thread.branch && await isBranchBanned(thread.branch)) || thread.adminDeleted))
        return undefined;
    else
        return thread;
}
exports.getThreadById = getThreadById;
async function getThreadsCountForBranch(branch) {
    return (await db.query(`
        SELECT count(*) FROM threads WHERE branch = $1
    `, [branch.name])).rows[0].count;
}
exports.getThreadsCountForBranch = getThreadsCountForBranch;
let getThreadCommentsCountCache = cache.createCache({
    expireTime: 1000 * 60 * 5,
    invalidTime: 1000 * 60 * 30,
    cleanInterval: 1000 * 60 * 60,
    fetchItem: doGetThreadCommentsCount
});
function getThreadCommentsCount(id) {
    return getThreadCommentsCountCache.get(id);
}
exports.getThreadCommentsCount = getThreadCommentsCount;
async function doGetThreadCommentsCount(id) {
    return parseInt((await db.query(`
        WITH RECURSIVE rec AS (
            SELECT C1.* FROM comments as C1
            WHERE C1.in_reply_to = $1
            
            UNION ALL
            
            SELECT c.*
            FROM rec as rec, comments as c
            WHERE c.in_reply_to = rec.id
        )
        
        SELECT count(*) FROM rec;
    `, [id])).rows[0].count, 10);
}
async function getThreadCommentsForClient(user, id) {
    let thread = await getThreadById(id);
    thread.likes = await getLikesByObject(thread);
    if (thread) {
        let commentColumns = modelInterfaces.columnsOfDefinition(modelInterfaces_1.CommentDefinition)
            .filter(name => name != "tags")
            .map(c => `rec."${c}"`).join(", ");
        let childrensMap = (await db.query(`
            WITH RECURSIVE rec AS (
                SELECT C1.* FROM comments as C1
                WHERE C1.in_reply_to = $1
                
                UNION ALL
                
                SELECT c.*
                FROM rec as rec, comments as c
                WHERE c.in_reply_to = rec.id
            )
            
            SELECT ${commentColumns}
                 , count(likes) + COALESCE(SUM(like_b.amount), 0) as likes
                 , EXISTS(SELECT * FROM likes WHERE likes.author = $2 AND likes.object = rec.id) as liked
                 FROM rec
            
            LEFT JOIN likes ON likes.object = rec.id
            LEFT JOIN like_bundles as like_b ON like_b.object = rec.id
            
            GROUP BY ${commentColumns}
        `, [id, user ? user.name : "" /*this could be a bad idea, I don't know...*/]))
            .rows.map((o) => db.fromDBObject(o, modelInterfaces_1.CommentDefinition))
            .reduce((acc, value) => {
            if (!acc[value.inReplyTo])
                acc[value.inReplyTo] = [];
            acc[value.inReplyTo].push(value);
            return acc;
        }, {});
        async function treeFor(c) {
            return {
                comment: c,
                childrens: (await Promise.all((childrensMap[c.id] || []).map(comment => treeFor(comment)))).sort((c1, c2) => c2.score - c1.score),
                liked: c.liked,
                likes: parseInt(c.likes),
                score: calculateScore(c.likes, c.published)
            };
        }
        let tree = await treeFor(thread);
        return tree;
    }
    else
        return undefined;
}
exports.getThreadCommentsForClient = getThreadCommentsForClient;
async function getThreadFlatComments(thread) {
    let tree = await getThreadCommentsForClient(undefined, thread.id);
    if (tree) {
        let cmts = [];
        function doList(l) {
            l.map(ct => {
                cmts.push(ct.comment);
                doList(ct.childrens);
            });
        }
        doList(tree.childrens);
        return cmts;
    }
    else {
        throw ("Could not find own thread? " + JSON.stringify(thread));
    }
}
exports.getThreadFlatComments = getThreadFlatComments;
async function createThread(author, title, content, branch) {
    let thread = {
        id: utils.urlForPath("thread/" + utils.intToBase64(Math.random() * 100000000000000000)),
        isLink: utils.isUrl(content),
        title: title,
        content: content,
        media: undefined,
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        inReplyTo: undefined,
        branch: branch,
        adminDeleted: false,
        tags: [],
        lastUpdate: 0
    };
    let gotMedia = utils.getUrlFromOpenGraph(content).then(async (media) => {
        await db.updateFieldsWhere("threads", { id: thread.id }, {
            media: JSON.stringify(media)
        });
        if (media && media.type == utils.MediaType.Image) {
            utils.downloadThumbnail(media.url)
                .then(thumbnail => {
                media.thumbnail = thumbnail;
                db.updateFieldsWhere("threads", { id: thread.id }, {
                    media: JSON.stringify(media)
                });
            });
        }
        console.log("OVER MEDIA");
    }).catch(() => { console.log("ERROR MEDIA"); });
    await createActivity(author, thread);
    let qName = utils.parseQualifiedName(branch);
    if (!qName.isOwn) {
        let remoteHost = utils.protocol() + "://" + qName.host + "/inbox";
        let jsonComment = JSON.stringify(await threadToJSON(thread));
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err, resp, body) => {
            console.log("Answer from remote inbox", err, body);
        });
    }
    await insertThread(thread);
    return {
        thread: thread,
        gotMedia: gotMedia
    };
}
exports.createThread = createThread;
async function updateThread(thread, content) {
    await db.updateFieldsWhere("threads", { id: thread.id }, { content: content });
}
exports.updateThread = updateThread;
async function calculateCommentScore(comment) {
    let likes = (await getLikesByObject(comment)) + await getRemoteLikesAmount(comment);
    return calculateScore(likes, comment.published);
}
exports.calculateCommentScore = calculateCommentScore;
function calculateScore(likes, published) {
    let now = new Date().getTime();
    let age = (now - published) / 1000 / 60 / 60 / 24;
    let score = 0;
    if (age < 2)
        score = -0.5 * Math.cos(age * (Math.PI / 2)) + 0.5;
    else
        score = (-age / 6) + 4 / 3;
    if (score > 0)
        return score * (likes + 1); // + 1 since score * 0 is 0 and we want scores to continues in the negatives
    else
        return score / (likes + 1); // + 1 since score * 0 is 0 and we want scores to continues in the negatives
}
exports.calculateScore = calculateScore;
let pageSize = 20;
async function threadToThreadForUI(user, thread) {
    return Object.assign({}, thread, { likes: (await getLikesByObject(thread)) + await getRemoteLikesAmount(thread), score: await calculateCommentScore(thread), liked: user ? (await hasActorLiked(user, thread)) : false, pined: false, commentsCount: await getThreadCommentsCount(thread.id) });
}
async function getHotThreadsByBranch(branch, user, page) {
    let possibleWhere = branch ? `WHERE threads.branch = '${branch}'` : "";
    let threadsColumns = modelInterfaces.columnsOfDefinition(modelInterfaces_1.ThreadHeaderDefinition)
        .map(c => `threads."${c}"`).join(", ");
    let threads = (await db.query(`
        SELECT *,
          CASE WHEN a3.score1 > 0
            THEN a3.score1 * (a3.likes + 1)
            ELSE a3.score1 / (a3.likes + 1)
          END as score
        FROM (
            SELECT *,
              CASE WHEN a2.age < 2
                THEN (-0.5 * COS(age * (PI() / 2))) + 0.5
                ELSE (-age / 6) + (4/3)
              END as score1
            FROM (
                SELECT *, (($1 - comments.published) / 1000 / 60 / 60 / 24) as age
                FROM (
                    SELECT ${threadsColumns} , count(likes) + COALESCE(SUM(bundle.amount), 0) as likes FROM threads
                    LEFT JOIN likes ON likes.object = threads.id
                    LEFT JOIN like_bundles as bundle ON bundle.object = threads.id
                    ${possibleWhere}
                    GROUP BY threads.id
                ) a1
                
                LEFT JOIN comments ON comments.id = a1.id
            ) a2
        ) a3
        
        ORDER BY score DESC
        
        LIMIT $2
        OFFSET $3
    `, [new Date().getTime(), pageSize, page * pageSize]))
        .rows.map((row) => db.fromDBObject(row, Object.assign({}, modelInterfaces_1.ThreadDefinition, { likes: { tsType: "number" }, score: { tsType: "number" } })));
    threads = await Promise.all(threads.map((thread) => {
        return threadToThreadForUI(user, thread);
    }));
    if (branch) {
        let br = await getBranchByName(branch);
        if (br) {
            threads.splice(0, 0, ...(await Promise.all(br.pinedThreads.map(async (id) => {
                let th = await getThreadById(id);
                if (th) {
                    let thui = await threadToThreadForUI(user, th);
                    thui.pined = true;
                    return thui;
                }
            }))).filter(t => !!t));
        }
    }
    return threads;
}
exports.getHotThreadsByBranch = getHotThreadsByBranch;
async function getTopThreadsByBranch(branch, user, page) {
    let possibleWhere = branch ? `WHERE threads.branch = '${branch}'` : "";
    let threads = (await db.query(`
        SELECT threads.* , count(likes) + COALESCE(SUM(bundle.amount), 0) as likes FROM threads
        
        LEFT JOIN likes ON likes.object = threads.id
        LEFT JOIN like_bundles as bundle ON bundle.object = threads.id
        
        ${possibleWhere}
        
        GROUP BY threads.id
        ORDER BY likes DESC
        
        LIMIT $1
        OFFSET $2
    `, [pageSize, page * pageSize]))
        .rows.map((row) => db.fromDBObject(row, Object.assign({}, modelInterfaces_1.ThreadDefinition, { likes: { tsType: "number" } })));
    threads = await Promise.all(threads.map((thread) => {
        return threadToThreadForUI(user, thread);
    }));
    return threads;
}
exports.getTopThreadsByBranch = getTopThreadsByBranch;
async function getNewThreadsByBranch(branch, user, page) {
    let possibleWhere = branch ? `WHERE threads.branch = '${branch}'` : "";
    let threads = (await db.query(`
        SELECT threads.*, comments.published, count(likes) + COALESCE(SUM(bundle.amount), 0) as likes FROM threads
        
        LEFT JOIN likes ON likes.object = threads.id
        LEFT JOIN like_bundles as bundle ON bundle.object = threads.id
        LEFT JOIN comments ON comments.id = threads.id
        
        ${possibleWhere}
        
        GROUP BY threads.id, comments.id
        ORDER BY comments.published DESC
        
        LIMIT $1
        OFFSET $2
    `, [pageSize, page * pageSize]))
        .rows.map((row) => db.fromDBObject(row, Object.assign({}, modelInterfaces_1.ThreadDefinition, { likes: { tsType: "number" } })));
    threads = await Promise.all(threads.map((thread) => {
        return threadToThreadForUI(user, thread);
    }));
    return threads;
}
exports.getNewThreadsByBranch = getNewThreadsByBranch;
// REMOTEINSTANCE
const insertRemoteInstance = db.insertForType("remote_instances", modelInterfaces_1.RemoteInstanceDefinition);
async function createRemoteInstance(host, name, blocked) {
    let { body } = await utils.request({
        method: "GET",
        url: utils.protocol() + "://" + host + "/api/v1/instance",
        headers: { "Accept": "application/json" }
    });
    let json = JSON.parse(body);
    let remoteInstance = {
        host: host,
        name: json.title || name,
        blocked: blocked
    };
    await insertRemoteInstance(remoteInstance);
    return remoteInstance;
}
exports.createRemoteInstance = createRemoteInstance;
const queryRemoteInstanceByHost = db.getObjectByField("remote_instances", "host");
async function getRemoteInstanceByHost(host) {
    let inst = await queryRemoteInstanceByHost(host);
    if (inst)
        return inst;
    else {
        let name = await utils.request({
            method: "GET",
            url: utils.protocol() + "://" + host + "/api/v1/instance",
            headers: { "Accept": "application/json" }
        }).then(datas => {
            return JSON.parse(datas.body).title;
        });
        inst = await createRemoteInstance(host, name, utils.getBlockNewInstances());
        return inst;
    }
}
exports.getRemoteInstanceByHost = getRemoteInstanceByHost;
exports.getRemoteInstances = db.getAllFrom("remote_instances");
async function setRemoteInstanceBlockedStatus(instance, blocked) {
    await db.updateFieldsWhere("remote_instances", {
        host: instance.host
    }, {
        blocked: blocked
    });
}
exports.setRemoteInstanceBlockedStatus = setRemoteInstanceBlockedStatus;
// FOLLOWS
const insertFollow = db.insertForType("follows", modelInterfaces_1.FollowDefinition);
async function createFollow(follower, target) {
    let follow = {
        follower: follower,
        target: target,
        id: Math.random() * 100000000000000000 + ""
    };
    await insertFollow(follow);
    return follow;
}
exports.createFollow = createFollow;
async function getFollowersByActor(actor) {
    return (await db.getObjectsWhere("follows", {
        target: actor
    })).map(follow => follow.follower);
}
exports.getFollowersByActor = getFollowersByActor;
