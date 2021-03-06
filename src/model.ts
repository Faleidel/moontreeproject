import * as fs from "fs";
import * as utils from "./utils";
import * as crypto from "crypto";
import * as urlLib from "url";
const request = require("request");
import * as cache from "./cache";
const { Pool } = require('pg')
import { User, UserDefinition
       , Notification, NotificationDefinition
       , Session, SessionDefinition
       , Activity, ActivityDefinition
       , Branch, BranchDefinition
       , Like, LikeDefinition
       , Follow, FollowDefinition
       , RemoteInstance, RemoteInstanceDefinition
       , LikeBundle, LikeBundleDefinition
       , Comment, CommentDefinition
       , Thread, ThreadDefinition
       , ThreadHeader, ThreadHeaderDefinition
       } from "./modelInterfaces";

import * as modelInterfaces from "./modelInterfaces";

export { User, UserDefinition
       , Notification, NotificationDefinition
       , Session, SessionDefinition
       , Activity, ActivityDefinition
       , Branch, BranchDefinition
       , Like, LikeDefinition
       , Follow, FollowDefinition
       , RemoteInstance, RemoteInstanceDefinition
       , LikeBundle, LikeBundleDefinition
       , Comment, CommentDefinition
       , Thread, ThreadDefinition
       , ThreadHeader, ThreadHeaderDefinition
       };

import * as db from "./db";

export async function activityToJSON(act: Activity): Promise<any | undefined> {
    let object: any = typeof (act as any).object == "object"
                      ? (act as any).object
                      : await getThreadById(act.objectId) || await getCommentById(act.objectId) as any as Comment;
    
    let user = await getUserByName(act.author);
    
    if (object && user) {
        let media: utils.ExternalMedia | undefined = (object as Thread).media;
        
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
            throw(new Error("Error creating JSON from activity"));
        }
    }
    else
        return undefined;
}

export async function createAnnounce(actorUrl: string, objectUrl: string): Promise<any> {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: utils.urlForPath("announce") + "/" + Math.random()*1000000000000,
        type: "Announce",
        actor: actorUrl,
        published: new Date().toISOString(),
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: await getFollowersByActor(actorUrl),
        object: objectUrl
    };
}

export async function commentToJSON(comment: Comment): Promise<any> {
    let media: utils.ExternalMedia | undefined = (comment as Thread).media;
    
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
export async function commentFromJSON(json: any): Promise<Comment | undefined> {
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

export interface CommentTree {
    comment: Comment,
    likes: number,
    liked: boolean,
    score: number,
    childrens: CommentTree[]
}

export async function threadToJSON(thread: Thread): Promise<any> {
    let result = {
        ... await commentToJSON(thread),
        
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"//,
            //"ironTreeThread"
        ],
        
        title: thread.title,
        branch: thread.branch.indexOf("@") == -1 ? thread.branch + "@" + utils.serverAddress() : thread.branch.split("@")[0],
        isLink: thread.isLink,
        media: thread.media,
        likes: await getRemoteLikesAmount(thread) + (await getLikesByObject(thread))
    };
    
    result.content = utils.renderMarkdown("# " + result.title + "\n" + result.content);
    
    return result;
}
export async function threadFromJSON(json: any): Promise<Thread | undefined> {
    let comment = await commentFromJSON(json);
    
    if (comment && json.isLink != undefined && json.branch != undefined)
        return {
            ... comment,
            
            title: json.title,
            branch: json.branch,
            isLink: json.isLink,
            media: json.media,
            adminDeleted: false,
            
            lastUpdate: new Date().getTime()
        };
    else
        return undefined;
}

export interface ThreadForUI extends Thread {
    commentsCount: number,
    likes: number,
    score: number,
    pined: boolean,
    liked: boolean
}

export async function branchToJSON(branch: Branch): Promise<any> {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        
        id: utils.urlForBranch(branch),
        type: "Person",
        preferredUsername: branch.name + "@" + utils.host,
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
export async function branchPostsToJSON(branch: Branch): Promise<any> {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        type: "OrderedCollection",
        first: utils.urlForBranch(branch) + "/outbox/?page=0",
        last: utils.urlForBranch(branch) + "/outbox/?page=10000", // TODO
        id: utils.urlForBranch(branch),
        totalItems: 1000, // TODO
        
        name: utils.renderQualifiedName(utils.parseQualifiedName(branch.name)),
        creator: utils.renderQualifiedName(utils.parseQualifiedName(branch.creator)),
        pinedThreads: branch.pinedThreads,
        description: branch.description
    };
}
export async function branchFromJSON(obj: any): Promise<Branch | undefined> {
    return {
        name: obj.name,
        creator: obj.creator,
        description: obj.description,
        sourceBranches: [],
        pinedThreads: obj.pinedThreads,
        lastUpdate: new Date().getTime(),
        icon: "",
        
        publicKey: "",
        privateKey: "",
        
        banned: false
    };
}

export let store = {}; // not used anymore

async function testLikeOn(comment: Comment, amount: number): Promise<void> {
    for (let i = 0 ; i < amount ; i++) {
        let user = await getUserByName("test"+i+"@"+utils.serverAddress());
        
        if (user) {
            let l = await createLike(user, comment);
            console.log(l);
        } else {
            console.log("bad user");
        }
    }
}

export function loadStore(cb: any): void {
    fs.readFile("store.json", "utf-8", async (err, data) => {
        if (data) {
            console.log("Loading JSON store...");
            store = JSON.parse(data);
            
            if (utils.migrationNumber == 1) {
                utils.log("Migration is 1, migrating to 2");
                
                // change activitys publish date from string format to timestamp
                Object.values((store as any).activitys as Activity[]).map((act: Activity) => {
                    act.published = new Date(act.published).getTime();
                });
                Object.values((store as any).comments as Comment[]).map(act => {
                    act.published = new Date(act.published).getTime();
                });
                Object.values((store as any).threads as Thread[]).map(act => {
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
                (store as any).follows = {};
                
                saveStore();
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 4) {
                await Promise.all(Object.values((store as any).branches as Branch[]).map(async (branch) => {
                    let kp = await utils.generateUserKeyPair();
                    
                    branch.privateKey = kp.privateKey;
                    branch.publicKey = kp.publicKey;
                }));
                
                saveStore();
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 5) {
                Object.values((store as any).branches as Branch[]).map(branch => {
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
                
                await Promise.all(Object.keys((store as any).users).map(async userName => {
                    console.log("Insert user", userName);
                    let user = (store as any).users[userName];
                    
                    await insertUser(user)
                    .catch((e: any) => console.log("Error adding user to userse table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            await db.dbReady;
            await modelInterfaces.createMissingTables()
            .catch(async e => {
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
                
                await modelInterfaces.createMissingTables()
            })
            
            if (utils.migrationNumber == 7) {
                await Promise.all(Object.keys((store as any).notifications).map(async notifId => {
                    let notif = (store as any).notifications[notifId];
                    
                    await insertNotification(notif)
                    .catch((e: any) => console.log("Error adding notification to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 8) {
                await Promise.all(Object.keys((store as any).sessions).map(async sessionId => {
                    let session = (store as any).sessions[sessionId];
                    
                    await insertSession(session)
                    .catch((e: any) => console.log("Error adding session to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 9) {
                await Promise.all(Object.keys((store as any).activitys).map(async actId => {
                    let activity = (store as any).activitys[actId];
                    
                    await insertActivity(activity)
                    .catch((e: any) => console.log("Error adding activity to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 10) {
                await Promise.all(Object.keys((store as any).branches).map(async branchId => {
                    let branch = (store as any).branches[branchId];
                    
                    await insertBranch(branch)
                    .catch((e: any) => console.log("Error adding branch to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 11) {
                await Promise.all(Object.keys((store as any).likes).map(async likeId => {
                    let like = (store as any).likes[likeId];
                    
                    await insertLike(like)
                    .catch((e: any) => console.log("Error adding like to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 12) {
                await Promise.all(Object.keys((store as any).follows).map(async followId => {
                    let follow = (store as any).follows[followId];
                    
                    await insertFollow(follow)
                    .catch((e: any) => console.log("Error adding follow to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 13) {
                await Promise.all(Object.keys((store as any).remoteInstances).map(async remoteId => {
                    let remoteInstance = (store as any).remoteInstances[remoteId];
                    
                    await insertRemoteInstance(remoteInstance)
                    .catch((e: any) => console.log("Error adding remoteInstance to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 14) {
                await Promise.all(Object.keys((store as any).likeBundles).map(async id => {
                    let bundle = (store as any).likeBundles[id];
                    
                    await insertLikeBundle(bundle)
                    .catch((e: any) => console.log("Error adding like bundle to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 15) {
                await Promise.all(Object.keys((store as any).comments).map(async id => {
                    let comment = (store as any).comments[id];
                    
                    comment.tags = comment.tags || []; //to fix a bug, lot's of comment's don't have tags but the field is mendatory
                    
                    await insertComment(comment)
                    .catch((e: any) => console.log("Error adding comment bundle to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 16) {
                await Promise.all(Object.keys((store as any).threads).map(async id => {
                    let thread = (store as any).threads[id];
                    
                    thread.tags = thread.tags || []; //to fix a bug, lot's of comment's don't have tags but the field is mendatory
                    
                    await insertThread(thread)
                    .catch((e: any) => console.log("Error adding thread bundle to table", e));
                }));
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            if (utils.migrationNumber == 17) {
                await db.query(`
                    ALTER TABLE url_view
                    ADD COLUMN user_agent text;
                `);
                
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
            
            // test code to generate random commentst tree for a thread
//            let user = await getUserByName("test0@192.168.117.101:9090");
//            let ids = [Object.values(store.threads)[Math.floor(Math.random()* threadLength)].id];
//            if (user ) {
//                for (let x = 0 ; x < 0 ; x++) {
//                    let comment = await createComment(user, Math.random() + "", ids[Math.floor(Math.random() * ids.length)]);
//                    ids.push(comment.id);
//                }
//            }
            
            console.log("Finised loading, migrating and indexing JSON store");
        } else {
            console.log("Got no store");
            (async () => {
                if (utils.generateTestData) {
                    console.log("Generating test datas");
                    
                    let admin = await createUser("admin", "admin") as any;
                    let admin2  = await createUser("admin2", "admin2") as any;
                    
                    utils.setAdmins(["admin@"+utils.serverAddress(), "admin2@"+utils.serverAddress()]);
                    
                    for (let i = 0 ; i < 20 ; i++)
                        await createUser("test" + i, "test" + i);
                    
                    await createBranch("gold", "This is the gold branch", [], admin);
                    await createBranch("silver", "This is the silver branch", [], admin2);
                    await createBranch("iron", "This is the iron branch", [], await getUserByName("test1@"+utils.serverAddress()) as any);
                    await createBranch("test", "This is the test branch", [], admin);
                    
                    let randomBranch = () => ["gold", "silver", "iron"][Math.floor(Math.random()*3)];
                    
                    for (let i = 0 ; i < 20 ; i++) {
                        let { thread } = await createThread(admin, "test thread" + i, "With no content", randomBranch());
                        thread.published -= Math.floor(1000 * 60 * 60 * 24 * 5 * Math.random());
                    }
                    
                    await (async () => {
//                        for (let tid in store.threads) {
//                            let c = await getThreadById(tid);
//                            if (c)
//                                await testLikeOn(c, Math.floor(Math.random()*5));
//                            else
//                                console.log("Bad thread", c);
//                        }
                    })();
                }
                
                saveStore();
                console.log("Generate new store");
            })();
        }
        
        cb();
    });
}
let saveTimeout: number | undefined = undefined;
export function saveStore(): void {
    if (!saveTimeout) {
        saveTimeout = setTimeout(() => {
            fs.writeFile("store.json", JSON.stringify(store, undefined, 4), () => {});
            saveTimeout = undefined;
        }, 2000) as any as number;
    }
}

// LIKE
const insertLike: (like: Like) => Promise<void> = db.insertForType("likes", LikeDefinition);
export async function createLike(author: User, object: Comment): Promise<Like | undefined> {
    // TODO
    let alreadyLiked = !!(await db.getObjectWhere("likes", {
        author: author.name,
        object: object.id
    }));
    
    if (alreadyLiked) {
        return undefined;
    } else {
        let like: Like = {
            id: Math.random() * 100000000000000000 + "",
            author: author.name,
            object: object.id
        };
        
        await insertLike(like);
        
        return like;
    }
}
export async function deleteLikeOfOn(actor: User, object: Comment): Promise<void> {
    db.deleteWhere("likes", {author: actor.name, object: object.id});
}
export const getLikeById: (id: string) => Promise<Like | undefined> = db.getObjectByField<Like>("likes", "id");
export async function getLikesByObject(object: Comment): Promise<number> {
    return db.countObjectsWhere("likes", {
        object: object.id
    });
}
export async function hasActorLiked(actor: User, object: Comment): Promise<boolean> {
    return !!(await db.getObjectWhere("likes", {
        author: actor.name,
        object: object.id
    }));
}

// LIKEBUNDLE
const insertLikeBundle: (bundle: LikeBundle) => Promise<void> = db.insertForType("like_bundles", LikeBundleDefinition);
export async function createOrUpdateLikeBundle(server: string, object: Comment, amount: number): Promise<LikeBundle | undefined> {
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
    } else {
        let bundle: LikeBundle = {
            server: server,
            object: object.id,
            amount: amount
        };
        
        await insertLikeBundle(bundle);
        
        return bundle;
    }
}
export async function getRemoteLikesAmount(object: Comment): Promise<number> {
    return parseInt((await db.query(`
        SELECT SUM(amount)
        FROM like_bundles
        WHERE object = '${object.id}'
    `)).rows[0].sum || 0, 10);
}

// USER
const queryUserByName: (name: string) => Promise<User | undefined> = db.getObjectByField<User>("users", "name");

export const getUserList: () => Promise<User[]> = db.getAllFrom("users");

const insertUser: (user: User) => Promise<void> = db.insertForType("users", UserDefinition);

export async function banUser(name: string): Promise<void> {
    await db.updateFieldsWhere("users", {name: name}, {banned: true});
}

export async function getUserByName(name: string): Promise<User | undefined> {
    let user = await queryUserByName(name);
    
    if (user) {
        if (user.local)
            return user
        else {
            if (new Date().getTime() - user.lastUpdate > (1000 * 60 * 60)) {
                user.lastUpdate = new Date().getTime();
                console.log("UPDATE USER DATA");
                await importForeignUserData(name);
            }
            
            return user;
        }
    } else {
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
export async function getForeignUser(name: string): Promise<User | undefined> {
    let domain = name.split("@")[1];
    
    let remoteInstance = await getRemoteInstanceByHost(domain);
    
    if (remoteInstance && !remoteInstance.blocked) {
        let userLink: string = await utils.request({
            methode: "GET",
            url: utils.protocol() + "://" + domain + "/.well-known/webfinger?resource=acct:" + name,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            let json = JSON.parse(datas.body);
            
            if (json.links && json.links.find((e: any) => e.rel == "self")) {
                return json.links.find((e: any) => e.rel == "self").href;
            }
            else
                throw("Bad json data");
        });
        
        let newUser: User = {
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
export async function importForeignUserData(name: string) {
    console.log("Importing user data:", name);
    let user = await getUserByName(name);
    
    if (user && !user.local) {
        let userInfos: any = await utils.request({
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
        
        let acts: any = await utils.request({
            url: actsPageUrl,
            headers: { "Accept": "application/json" }
        }).then(datas => {
            return JSON.parse(datas.body);
        });
        
        let activitys = acts.orderedItems.filter((act: any) => typeof act.object != "string");
        activitys.map((act: any) => act.object.content = act.object.content.replace(/<(?:.|\n)*?>/gm, ''));
        
        activitys.map(async (act: any) => {
            let exists = await getActivityById(act.id);
            
            if (!exists) {
                let comment: Comment = {
                    id: act.object.id,
                    content: act.object.content,
                    published: new Date(act.object.published).getTime(),
                    author: name,
                    to: act.object.to,
                    inReplyTo: act.object.inReplyTo,
                    tags: act.object.tag,
                    adminDeleted: false
                };
                
                let activity: Activity = {
                    id: act.id,
                    objectId: act.object.id,
                    published: new Date(act.published).getTime(),
                    author: name,
                    to: act.to
                };
                
                await insertComment(comment);
                await insertActivity(activity);
            }
        })
    }
}
export async function createUser(name: string, password: string): Promise<User | undefined> {
    name = name + "@" + utils.serverAddress();
    
    let user = await getUserByName(name);
    let branch = await getBranchByName(name);
    
    utils.alertLog("userCreation", `Creating User ${name}`);
    
    // Can't create the user if it already exists (same namespace as branches)
    if (!user && !branch) {
        let passwordSalt: string = await (new Promise((resolve, reject) => {
            crypto.randomBytes(512, (err, buf) => {
                if (err)
                    reject();
                else
                    resolve(buf.toString("hex") as string);
            });
        })) as string;
        let passwordHashed = await utils.hashPassword(password, passwordSalt);
        
        let u = await utils.generateUserKeyPair().then(async kp => {
            let user: User = {
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

// NOTIFICATION
const insertNotification: (notif: Notification) => Promise<void> = db.insertForType("notifications", NotificationDefinition);

export async function createNotification(recipient: User, title: string, content: string): Promise<Notification> {
    let notif = {
        id: Math.random() * 100000000000000000 + "",
        recipient: recipient.name,
        title: title,
        content: content,
        date: new Date().getTime(),
        read: false
    }
    
    await insertNotification(notif);
    
    return notif;
}

export const getNotificationById: (id: string) => Promise<Notification | undefined> = db.getObjectByField<Notification>("notifications", "id");

export async function getNotificationsByUserId(recipient: string): Promise<Notification[]> {
    return (await db.query(`
        SELECT * FROM notifications
        WHERE recipient = $1
        ORDER BY date DESC
    `, [recipient]))
    .rows.map((r: Notification) => db.fromDBObject(r, NotificationDefinition));
}
export const getNotificationsByUser: (recipient: User) => Promise<Notification[]> = function(user: User) {
    return getNotificationsByUserId(user.name);
}

export async function getNotificationCountByUser(recipient: User): Promise<number> {
    return (await getNotificationsByUser(recipient)).filter(n => !n.read).length;
}
export async function setNotificationRead(notification: Notification): Promise<void> {
    await db.updateFieldsWhere("notifications", {id: notification.id}, {read: true});
}

// BRANCH
export const queryBranchByName: (name: string) => Promise<Branch | undefined> = db.getObjectByField<Branch>("branches", "name");
const insertBranch: (branch: Branch) => Promise<void> = db.insertForType("branches", BranchDefinition);
export async function getBranchByName(name: string): Promise<Branch | undefined> {
    let branch = await queryBranchByName(name);
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
        } else {
            return await queryBranchByName(qName.name);
        }
    }
    else {
        if (!qName.isOwn && new Date().getTime()-branch.lastUpdate > (1000*60*2)) {
            branch.lastUpdate = new Date().getTime();
            await fetchRemoteBranchThreads(name);
        }
        
        if (branch.banned)
            return undefined;
        else
            return branch;
    }
}
export async function isBranchBanned(name: string): Promise<boolean> {
    return !(await getBranchByName(name));
}
export async function banBranch(name: string): Promise<void> {
    await db.updateFieldsWhere("branches", {name: name}, {banned: true});
}
export async function getRemoteBranchJSON(name: string): Promise<any | undefined> {
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
export async function fetchRemoteBranchThreads(name: string): Promise<void> {
    let branchJson = await getRemoteBranchJSON(name);
    
    if (branchJson) {
        let mBranch = await branchFromJSON(branchJson);
        
        if (mBranch) {
            let pageUrl = branchJson.first;
            
            for (let i = 0 ; i < 10 && pageUrl ; i++) {
                let datas = await utils.request({
                    method: "GET",
                    url: pageUrl,
                    headers: { "Accept": "application/json" }
                });
                
                let page = JSON.parse(datas.body);
                
                await Promise.all(page.orderedItems.map(async (threadJSON: any) => {
                    let thread = await threadFromJSON(threadJSON);
                    
                    if (thread) {
                        await insertThread(thread);
                        let {host} = urlLib.parse(thread.id) as any;
                        await createOrUpdateLikeBundle(host, thread, threadJSON.likes);
                    }
                }));
                
                pageUrl = page.next;
            }
        }
    }
}
export async function createBranch(name: string, description: string, sourceBranches: string[], creator: User): Promise<Branch | undefined> {
    let exists = await getBranchByName(name);
    let existsUser = await getUserByName(name);
    
    if (exists || existsUser) {
        return undefined;
    } else {
        let kp = await utils.generateUserKeyPair();
        
        let branch: Branch = {
            name: name,
            description: description,
            creator: creator.name,
            sourceBranches: sourceBranches,
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
export async function setBranchIcon(branch: Branch, iconPath: string): Promise<void> {
    await db.updateFieldsWhere("branches", {name: branch.name}, {icon: iconPath});
}
export async function isBranchAdmin(user: User | undefined, branch: Branch): Promise<boolean> {
    if (!user)
        return false;
    else
        return branch.creator == user.name;
}
export async function setBranchPinedThreads(branch: Branch, pinedThreads: string[]): Promise<void> {
    await db.updateFieldsWhere("branches", {name: branch.name}, {pinedThreads: pinedThreads});
}
export async function unsafeBranchList(): Promise<Branch[]> {
    return (await db.getAllFrom<Branch>("branches")()).filter(b => !b.banned);
}

// SESSION
export const getSessionById: (id: string) => Promise<Session | undefined> = db.getObjectByField<Session>("sessions", "id");
const insertSession: (session: Session) => Promise<void> = db.insertForType("sessions", SessionDefinition);
export async function createSession(): Promise<Session> {
    let session: Session = {
        id: Math.random() * 100000000000000000 + "",
        userName: undefined,
        creationDate: new Date().toUTCString()
    };
    
    await insertSession(session);
    
    return session;
}
export async function deleteSession(session: Session): Promise<void> {
    // TODO
    db.deleteWhere("sessions", {id: session.id});
}
export async function loginSession(session: Session, user: User): Promise<void> {
    await db.updateFieldsWhere("sessions", {id: session.id}, {userName: user.name});
}

// ACTIVITY
export const getActivityById: (id: string) => Promise<Activity | undefined> = db.getObjectByField<Activity>("activitys", "id");
const insertActivity: (activity: Activity) => Promise<void> = db.insertForType("activitys", ActivityDefinition);
export async function createActivity(author: User, object: Comment): Promise<Activity> {
    let activity: Activity = {
        id: utils.urlForPath("activity/" + (Math.random() * 100000000000000000)),
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        objectId: object.id
    }
    
    await insertActivity(activity);
    
    return activity;
}
export const getActivitysByAuthor: (id: string) => Promise<Activity[]> = db.getObjectsByField<Activity>("activitys", "author");

// COMMENTS
export const queryCommentById: (id: string) => Promise<Comment | undefined> = db.getObjectByField<Comment>("comments", "id");
export const insertComment: (comment: Comment) => Promise<void> = db.insertForType("comments", CommentDefinition);
export async function getCommentById(id: string): Promise<Comment | undefined> {
    let comment = await queryCommentById(id);
    
    if (comment && comment.adminDeleted)
        return undefined;
    else
        return comment;
}
export async function createComment(author: User, content: string, inReplyTo: string): Promise<Comment> {
    let comment: Comment = {
        id: utils.urlForPath("comment/" + utils.intToBase64(Math.random() * 100000000000000000)),
        content: content,
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        inReplyTo: inReplyTo,
        tags: [],
        adminDeleted: false
    }
    
    if (inReplyTo.split("/")[2] != utils.serverAddress()) { // send comment to remote server
        let remoteHost = utils.protocol() + "://" + inReplyTo.split("/")[2] + "/inbox";
        
        let jsonComment = JSON.stringify(await commentToJSON(comment));
        
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err: any, resp: any, body: any) => {
            console.log("Answer from remote inbox", err, body);
        });
    } else { // create notification to local user
        let objectT = await getThreadById(inReplyTo);
        let objectC = await getCommentById(inReplyTo);
        
        let object = objectT || objectC;
        
        if (object) {
            let recipient = await getUserByName(object.author);
            
            if (recipient) {
                let link = "## [comment link]("+comment.id+")";
                await createNotification(recipient, "New message from "+ author.name, link + "\n\n" + content);
            }
        }
    }
    
    await insertComment(comment);
    
    return comment;
}
export async function updateComment(comment: Comment, content: string): Promise<void> {
    await db.updateFieldsWhere("comments", {
        id: comment.id
    }, {
        content: content
    });
}
export async function getCommentsByAuthor(userName: string): Promise<Comment[] | undefined> {
    return await db.getObjectsWhere<Comment>("comments", {
        author: userName
    });
}
export async function adminDeleteComment(id: string): Promise<void> {
    await db.updateFieldsWhere("comments", {
        id: id
    }, {
        admin_deleted: true
    });
}
// THREAD
const insertThreadHeader: (thread: Thread) => Promise<void> = db.insertForType("threads", ThreadHeaderDefinition);
export async function insertThread(thread: Thread): Promise<void> {
    await insertThreadHeader(thread);
    await insertComment(thread);
}
export function isOwnThread(id: string): boolean {
    let qName = utils.parseQualifiedName(id);
    return qName.isOwn;
}
export async function queryThreadById(id: string): Promise<Thread | undefined> {
    let obj = (await db.query(`
        SELECT *
        FROM threads
        INNER JOIN comments ON comments.id = threads.id
        WHERE threads.id = $1
    `, [id])).rows[0];
    
    if (obj)
        return db.fromDBObject(obj, ThreadDefinition);
    else
        return;
}
export async function getThreadById(id: string): Promise<Thread | undefined> {
    let thread = await queryThreadById(id);
    
    if (!isOwnThread(id) && (!thread || (thread  && new Date().getTime()-thread.lastUpdate > 1000*60*10))) {
        thread = await ((async () => {
            let threadUrl = id;
            
            let {resp, body} = await utils.request({
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
                
                let {host} = urlLib.parse(newThread.id) as any;
                await createOrUpdateLikeBundle(host, newThread, threadJson.likes);
                
                await Promise.all(threadJson.childrens.map(async (c: any) => {
                    let comment = await commentFromJSON(c);
                    if (comment) {
                        await insertComment(comment);
                        let {host} = urlLib.parse(comment.id) as any;
                        await createOrUpdateLikeBundle(host, comment, c.likes);
                    }
                }));
                
                return await getThreadById(threadUrl);
            }
        })().catch((e) => { console.log(e) ; return undefined }));
    }
    
    if (thread && ((thread.branch && await isBranchBanned(thread.branch)) || thread.adminDeleted))
        return undefined;
    else
        return thread;
}
export async function getThreadsCountForBranch(branch: Branch): Promise<number> {
    return (await db.query(`
        SELECT count(*) FROM threads WHERE branch = $1
    `, [branch.name])).rows[0].count;
}
let getThreadCommentsCountCache: cache.Cache<string, number> = cache.createCache({
    expireTime: 1000 * 60 * 5,
    invalidTime: 1000 * 60 * 30,
    cleanInterval: 1000 * 60 * 60,
    fetchItem: doGetThreadCommentsCount
});
export function getThreadCommentsCount(id: string): Promise<number> { // return 0 if the id doesn't exists
    return getThreadCommentsCountCache.get(id);
}
async function doGetThreadCommentsCount(id: string): Promise<number> {
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
export async function getThreadCommentsForClient(user: User | undefined, id: string): Promise<CommentTree | undefined> {
    let thread: any = await getThreadById(id);
    
    thread.likes = await getLikesByObject(thread);
    
    if (thread) {
        let commentColumns = modelInterfaces.columnsOfDefinition(CommentDefinition)
                             .filter(name => name != "tags")
                             .map(c => `rec."${c}"`).join(", ");
        
        let childrensMap: {[key: string]: Comment[]} = (await db.query(`
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
        .rows.map((o: Comment) => db.fromDBObject(o, CommentDefinition))
        .reduce((acc: {[key: string]: Comment[]}, value: Comment) => {
            if (!acc[value.inReplyTo!])
                acc[value.inReplyTo!] = [];
            
            acc[value.inReplyTo!].push(value);
            
            return acc;
        }, {});
        
        async function treeFor(c: any): Promise<CommentTree> {
            return {
                comment: c as Comment,
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
        return undefined
}
export async function getThreadFlatComments(thread: Thread): Promise<Comment[]> {
    let tree = await getThreadCommentsForClient(undefined, thread.id);
    
    if (tree) {
        let cmts: Comment[] = [];
        
        function doList(l: CommentTree[]) {
            l.map(ct => {
                cmts.push(ct.comment)
                doList(ct.childrens);
            });
        }
        doList(tree.childrens);
        
        return cmts;
    } else {
        throw("Could not find own thread? " + JSON.stringify(thread));
    }
}
export async function createThread(author: User, title: string, content: string, branch: string): Promise<{ thread: Thread, gotMedia: Promise<void> }> {
    let thread: Thread = {
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
    }
    
    let gotMedia = utils.getUrlFromOpenGraph(content).then(async media => {
        await db.updateFieldsWhere("threads", {id: thread.id}, {
            media: JSON.stringify(media)
        });
        
        if (media && media.type == utils.MediaType.Image) {
            utils.downloadThumbnail(media.url)
            .then(thumbnail => {
                media.thumbnail = thumbnail;
                db.updateFieldsWhere("threads", {id: thread.id}, {
                    media: JSON.stringify(media)
                });
            });
        }
        
        console.log("OVER MEDIA");
    }).catch(() => {console.log("ERROR MEDIA")});
    
    await createActivity(author, thread);
    
    let qName = utils.parseQualifiedName(branch);
    if (!qName.isOwn) {
        let remoteHost = utils.protocol() + "://" + qName.host + "/inbox";
        
        let jsonComment = JSON.stringify(await threadToJSON(thread));
        
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err: any, resp: any, body: any) => {
            console.log("Answer from remote inbox", err, body);
        });
    }
    
    await insertThread(thread);
    
    return {
        thread: thread,
        gotMedia: gotMedia
    };
}
export async function updateThread(thread: Thread, content: string): Promise<void> {
   await db.updateFieldsWhere("threads", {id: thread.id}, {content: content});
}
export async function calculateCommentScore(comment: Comment): Promise<number> {
    let likes = (await getLikesByObject(comment)) + await getRemoteLikesAmount(comment);
    return calculateScore(likes, comment.published);
}
export function calculateScore(likes: number, published: number): number {
    let now = new Date().getTime();
    
    let age = (now - published) / 1000 / 60 / 60 / 24;
    
    let score = 0;
    
    if (age < 2)
        score = -0.5 * Math.cos(age * (Math.PI / 2)) + 0.5;
    else
        score = (-age / 6) + 4/3;
    
    if (score > 0)
        return score * (likes + 1); // + 1 since score * 0 is 0 and we want scores to continues in the negatives
    else
        return score / (likes + 1); // + 1 since score * 0 is 0 and we want scores to continues in the negatives
}
let pageSize = 20;
async function threadToThreadForUI(user: User | undefined, thread: Thread): Promise<ThreadForUI> {
    return {
        ...thread,
        likes: (await getLikesByObject(thread)) + await getRemoteLikesAmount(thread),
        score: await calculateCommentScore(thread),
        liked: user ? (await hasActorLiked(user, thread)) : false,
        pined: false,
        commentsCount: await getThreadCommentsCount(thread.id)
    };
}
export async function getHotThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
    let possibleWhere = branch ? `WHERE threads.branch = '${branch}'` : "";
    
    let threadsColumns = modelInterfaces.columnsOfDefinition(ThreadHeaderDefinition)
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
    .rows.map((row: Thread) => db.fromDBObject(row, {
        ...ThreadDefinition,
        likes: { tsType: "number" },
        score: { tsType: "number" }
    }));
    
    threads = await Promise.all(threads.map((thread: Thread) => {
        return threadToThreadForUI(user, thread);
    }));
    
    if (branch) {
        let br = await getBranchByName(branch);
        
        if (br) {
            threads.splice(0, 0, ...(await Promise.all(br.pinedThreads.map(async (id: string) => {
                let th = await getThreadById(id);
                if (th) {
                    let thui = await threadToThreadForUI(user, th);
                    thui.pined = true;
                    return thui;
                }
            }))).filter(t => !!t) as ThreadForUI[]);
        }
    }
    
    return threads;
}

export async function getTopThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
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
    .rows.map((row: Thread) => db.fromDBObject(row, {
        ...ThreadDefinition,
        likes: { tsType: "number" }
    }));
    
    threads = await Promise.all(threads.map((thread: Thread) => {
        return threadToThreadForUI(user, thread);
    }));
    
    return threads;
}

export async function getNewThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
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
    .rows.map((row: Thread) => db.fromDBObject(row, {
        ...ThreadDefinition,
        likes: { tsType: "number" }
    }));
    
    threads = await Promise.all(threads.map((thread: Thread) => {
        return threadToThreadForUI(user, thread);
    }));
    
    return threads;
}

// REMOTEINSTANCE
const insertRemoteInstance: (remoteInstance: RemoteInstance) => Promise<void> = db.insertForType("remote_instances", RemoteInstanceDefinition);
export async function createRemoteInstance(host: string, name: string, blocked: boolean): Promise<RemoteInstance | undefined> {
    let {body} = await utils.request({
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
const queryRemoteInstanceByHost: (host: string) => Promise<RemoteInstance | undefined> = db.getObjectByField<RemoteInstance>("remote_instances", "host");
export async function getRemoteInstanceByHost(host: string): Promise<RemoteInstance | undefined> {
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
export const getRemoteInstances: () => Promise<RemoteInstance[]> = db.getAllFrom("remote_instances");
export async function setRemoteInstanceBlockedStatus(instance: RemoteInstance, blocked: boolean) {
    await db.updateFieldsWhere("remote_instances", {
        host: instance.host
    }, {
        blocked: blocked
    });
}
// FOLLOWS
const insertFollow: (follow: Follow) => Promise<void> = db.insertForType("follows", FollowDefinition);
export async function createFollow(follower: string, target: string): Promise<Follow> {
    let follow = {
        follower: follower,
        target: target,
        id: Math.random() * 100000000000000000 + ""
    };
    
    await insertFollow(follow);
    
    return follow;
}
export async function getFollowersByActor(actor: string): Promise<string[]> {
    return (await db.getObjectsWhere<Follow>("follows", {
        target: actor
    })).map(follow => follow.follower);
}
