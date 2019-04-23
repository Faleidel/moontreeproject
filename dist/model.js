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
async function activityToJSON(act) {
    let object = typeof act.object == "object"
        ? act.object
        : await getThreadById(act.objectId) || await getCommentById(act.objectId);
    if (object) {
        return {
            "@context": [
                "https://www.w3.org/ns/activitystreams",
                "https://w3id.org/security/v1"
            ],
            id: act.id,
            type: "Create",
            to: act.to,
            cc: ["https://mastodon.social/users/faleidel"],
            published: new Date(act.published).toISOString(),
            actor: utils.urlForPath("user/" + act.author),
            object: {
                type: "Note",
                id: object.id,
                url: object.id,
                attachment: [],
                attributedTo: act.author,
                actor: utils.urlForPath("user/" + act.author),
                to: object.to,
                cc: ["https://mastodon.social/users/faleidel"],
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
    else
        return undefined;
}
exports.activityToJSON = activityToJSON;
async function commentToJSON(comment) {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: comment.id,
        type: "Note",
        to: comment.to,
        published: comment.published,
        attributedTo: comment.author,
        inReplyTo: comment.inReplyTo,
        content: comment.content,
        likes: await getRemoteLikesAmount(comment) + (await getLikesByObject(comment)).length
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
    return Object.assign({}, await commentToJSON(thread), { "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1",
            "ironTreeThread"
        ], title: thread.title, branch: thread.branch.indexOf("@") == -1 ? thread.branch + "@" + utils.serverAddress : thread.branch.split("@")[0], isLink: thread.isLink, media: thread.media, likes: await getRemoteLikesAmount(thread) + (await getLikesByObject(thread)).length });
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
        type: "OrderedCollection",
        first: utils.urlForPath("branch/" + branch.name + "?page=0"),
        last: utils.urlForPath("branch/" + branch.name + "?page=10000"),
        id: utils.urlForPath("branch/" + branch.name),
        totalItems: 1000,
        name: utils.renderQualifiedName(utils.parseQualifiedName(branch.name)),
        creator: utils.renderQualifiedName(utils.parseQualifiedName(branch.creator)),
        pinedThreads: branch.pinedThreads,
        description: branch.description
    };
}
exports.branchToJSON = branchToJSON;
async function branchFromJSON(obj) {
    return {
        name: obj.name,
        creator: obj.creator,
        description: obj.description,
        sourceBranches: [],
        pinedThreads: obj.pinedThreads,
        lastUpdate: new Date().getTime(),
        banned: false
    };
}
exports.branchFromJSON = branchFromJSON;
exports.store = {
    users: {},
    sessions: {},
    activitys: {},
    comments: {},
    threads: {},
    branches: {},
    likes: {},
    likeBundles: {},
    remoteInstances: {},
    notifications: {}
};
let indexs = {
    commentChildrens: {},
    userComments: {},
    userActivitys: {},
    hotThreadsByBranch: {},
    likesByObject: {},
    likeOfActorOnObject: {},
    likeBundlesByObject: {},
    branchesBySource: {},
    notificationsByUser: {}
};
function addToIndex(indexName, key, value) {
    let list = indexs[indexName][key];
    if (!list) {
        list = [];
        indexs[indexName][key] = list;
    }
    list.push(value);
}
function indexComment(comment) {
    if (!indexs.userComments[comment.author] || !indexs.userComments[comment.author].find(c => c == comment.id))
        addToIndex("userComments", comment.author, comment.id);
    if (comment.inReplyTo && (!indexs.commentChildrens[comment.inReplyTo] || !indexs.commentChildrens[comment.inReplyTo].find(c => c == comment.id)))
        addToIndex("commentChildrens", comment.inReplyTo, comment.id);
}
function indexThread(thread) {
    if (!indexs.hotThreadsByBranch[thread.branch] || !indexs.hotThreadsByBranch[thread.branch].find(c => c == thread.id))
        addToIndex("hotThreadsByBranch", thread.branch, thread.id);
}
function indexActivity(activity) {
    addToIndex("userActivitys", activity.author, activity.id);
}
function indexLike(like) {
    addToIndex("likesByObject", like.object, like.id);
    indexs.likeOfActorOnObject[like.author + like.object] = like;
}
function unindexLike(like) {
    let likeList = indexs.likesByObject[like.object];
    for (let i = 0; i < likeList.length; i++) {
        if (likeList[i] == like.id) {
            likeList.splice(i, 1);
        }
    }
    delete indexs.likeOfActorOnObject[like.author + like.object];
}
function indexLikeBundle(likeBundle) {
    addToIndex("likeBundlesByObject", likeBundle.object, likeBundle.object + likeBundle.server);
}
function indexNotification(notification) {
    addToIndex("notificationsByUser", notification.recipient, notification.id);
}
async function testLikeOn(comment, amount) {
    for (let i = 0; i < amount; i++) {
        let user = await getUserByName("test" + i + "@" + utils.serverAddress);
        if (user) {
            let l = await createLike(user, comment);
            console.log(l);
        }
        else {
            console.log("bad user");
        }
    }
}
function loadStore(cb) {
    fs.readFile("store.json", "utf-8", (err, data) => {
        if (data) {
            console.log("Got store");
            exports.store = JSON.parse(data);
            Object.values(exports.store.comments).map(c => indexComment(c));
            Object.values(exports.store.threads).map(t => indexComment(t));
            Object.values(exports.store.threads).map(t => indexThread(t));
            Object.values(exports.store.activitys).map(t => indexActivity(t));
            Object.values(exports.store.likes).map(t => indexLike(t));
            Object.values(exports.store.likeBundles).map(t => indexLikeBundle(t));
            Object.values(exports.store.notifications).map(t => indexNotification(t));
            if (utils.migrationNumber == 1) {
                utils.log("Migration is 1, migrating to 2");
                // change activitys publish date from string format to timestamp
                Object.values(exports.store.activitys).map(act => {
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
                utils.log("Migration is 1, migrating to 2");
                Object.values(exports.store.users).map(user => user.followers = []);
                saveStore();
                utils.setMigrationNumber(utils.migrationNumber + 1);
            }
        }
        else {
            console.log("Got no store");
            (async () => {
                if (utils.generateTestData) {
                    console.log("Generating test datas");
                    let admin = await createUser("admin", "admin");
                    let admin2 = await createUser("admin2", "admin2");
                    utils.setAdmins(["admin@" + utils.serverAddress, "admin2@" + utils.serverAddress]);
                    for (let i = 0; i < 20; i++)
                        await createUser("test" + i, "test" + i);
                    await createBranch("gold", "This is the gold branch", [], admin);
                    await createBranch("silver", "This is the silver branch", [], admin2);
                    await createBranch("iron", "This is the iron branch", [], await getUserByName("test1@" + utils.serverAddress));
                    await createBranch("test", "This is the test branch", [], admin);
                    let randomBranch = () => ["gold", "silver", "iron"][Math.floor(Math.random() * 3)];
                    for (let i = 0; i < 200; i++) {
                        let thread = await createThread(admin, "test thread" + i, "With no content", randomBranch());
                        thread.published -= Math.floor(1000 * 60 * 60 * 24 * 5 * Math.random());
                    }
                    await (async () => {
                        for (let tid in exports.store.threads) {
                            let c = await getThreadById(tid);
                            if (c)
                                await testLikeOn(c, Math.floor(Math.random() * 20));
                            else
                                console.log("Bad thread", c);
                        }
                    })();
                }
                saveStore();
                console.log("Generate new store");
            })();
        }
        cb();
    });
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
async function createLike(author, object) {
    let likesOfObject = await getLikesByObject(object);
    let alreadyLiked = likesOfObject.some(l => l.author == author.name);
    if (alreadyLiked) {
        return undefined;
    }
    else {
        let like = {
            id: Math.random() * 100000000000000000 + "",
            author: author.name,
            object: object.id
        };
        exports.store.likes[like.id] = like;
        indexLike(like);
        saveStore();
        return like;
    }
}
exports.createLike = createLike;
async function deleteLikeOfOn(actor, object) {
    let indexKey = actor.name + object.id;
    let like = indexs.likeOfActorOnObject[indexKey];
    if (like) {
        delete exports.store.likes[like.id];
        unindexLike(like);
    }
    saveStore();
}
exports.deleteLikeOfOn = deleteLikeOfOn;
async function getLikeById(id) {
    return exports.store.likes[id];
}
exports.getLikeById = getLikeById;
async function getLikesByObject(object) {
    return (await Promise.all((indexs.likesByObject[object.id] || []).map(getLikeById))).filter((x) => !!x);
}
exports.getLikesByObject = getLikesByObject;
async function hasActorLiked(actor, object) {
    return !!indexs.likeOfActorOnObject[actor.name + object.id];
}
exports.hasActorLiked = hasActorLiked;
async function createOrUpdateLikeBundle(server, object, amount) {
    let pastBundle = exports.store.likeBundles[object.id + server];
    if (pastBundle) {
        pastBundle.amount = amount;
        saveStore();
    }
    else {
        let bundle = {
            server: server,
            object: object.id,
            amount: amount
        };
        exports.store.likeBundles[bundle.object + bundle.server] = bundle;
        indexLikeBundle(bundle);
        saveStore();
        return bundle;
    }
}
exports.createOrUpdateLikeBundle = createOrUpdateLikeBundle;
async function getLikeBundleById(id) {
    return exports.store.likeBundles[id];
}
exports.getLikeBundleById = getLikeBundleById;
async function getRemoteLikesAmount(object) {
    let bundles = (await Promise.all((indexs.likeBundlesByObject[object.id] || [])
        .map(async (id) => await getLikeBundleById(id)))).filter(e => !!e);
    return bundles.reduce((acc, bundle) => acc + bundle.amount, 0);
}
exports.getRemoteLikesAmount = getRemoteLikesAmount;
// USER
async function getUserByName(name) {
    let user = exports.store.users[name];
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
        if (name.indexOf("@" + utils.serverAddress) == -1) {
            if (name.indexOf("@") == -1)
                return await getUserByName(name + "@" + utils.serverAddress);
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
async function getUserList() {
    return Object.values(exports.store.users);
}
exports.getUserList = getUserList;
async function addUserFollower(user, follower) {
    user.followers.push(follower);
    saveStore();
}
exports.addUserFollower = addUserFollower;
async function getForeignUser(name) {
    let domain = name.split("@")[1];
    let remoteInstance = await getRemoteInstanceByHost(domain);
    if (remoteInstance && !remoteInstance.blocked) {
        let userLink = await utils.request({
            methode: "GET",
            url: utils.protocol + "://" + domain + "/.well-known/webfinger?resource=acct:" + name,
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
            followers: [],
            banned: false
        };
        exports.store.users[name] = newUser;
        saveStore();
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
            let exists = await getActivityById(act.id);
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
                exports.store.comments[comment.id] = comment;
                exports.store.activitys[activity.id] = activity;
                indexComment(comment);
                indexActivity(activity);
                saveStore();
            }
        });
    }
}
exports.importForeignUserData = importForeignUserData;
async function createUser(name, password) {
    name = name + "@" + utils.serverAddress;
    let user = await getUserByName(name);
    // Can't create the user if it already exists
    if (!user) {
        let passwordSalt = await (new Promise((resolve, reject) => {
            crypto.randomBytes(512, (err, buf) => {
                if (err)
                    reject();
                else
                    resolve(buf.toString("hex"));
            });
        }));
        let passwordHashed = await utils.hashPassword(password, passwordSalt);
        let u = await utils.generateUserKeyPair().then(kp => {
            let user = {
                name: name,
                passwordHashed: passwordHashed,
                passwordSalt: passwordSalt,
                publicKey: kp.publicKey,
                privateKey: kp.privateKey,
                local: true,
                lastUpdate: 0,
                foreignUrl: "",
                followers: [],
                banned: false
            };
            exports.store.users[name] = user;
            saveStore();
            console.log("MADE USER");
            return user;
        });
        console.log("RETURN USER", u);
        return u;
    }
    else {
        console.log("USER EXISTS");
        return Promise.resolve(undefined);
    }
}
exports.createUser = createUser;
async function banUser(name) {
    let user = await getUserByName(name);
    if (user) {
        user.banned = true;
        Object.values(exports.store.sessions).map(session => {
            if (session.userName == name) {
                session.userName = undefined;
            }
        });
        saveStore();
    }
}
exports.banUser = banUser;
// NOTIFICATION
async function createNotification(recipient, title, content) {
    let notif = {
        id: Math.random() * 100000000000000000 + "",
        recipient: recipient.name,
        title: title,
        content: content,
        date: new Date().getTime(),
        read: false
    };
    exports.store.notifications[notif.id] = notif;
    indexNotification(notif);
    saveStore();
    return notif;
}
exports.createNotification = createNotification;
async function getNotificationsById(id) {
    return exports.store.notifications[id];
}
exports.getNotificationsById = getNotificationsById;
async function getNotificationsByUser(recipient) {
    let ids = indexs.notificationsByUser[recipient.name] || [];
    let notifs = (await Promise.all(ids.map(id => getNotificationsById(id)))).filter(n => !!n);
    return notifs.sort((n1, n2) => n2.date - n1.date);
}
exports.getNotificationsByUser = getNotificationsByUser;
async function getNotificationCountByUser(recipient) {
    return (await getNotificationsByUser(recipient)).filter(n => !n.read).length;
}
exports.getNotificationCountByUser = getNotificationCountByUser;
async function setNotificationRead(notification) {
    notification.read = true;
    saveStore();
}
exports.setNotificationRead = setNotificationRead;
// BRANCH
async function getBranchByName(name) {
    let branch = exports.store.branches[name];
    let qName = utils.parseQualifiedName(name);
    if (!branch) {
        if (!qName.isOwn) {
            let branchJson = await getRemoteBranchJSON(name);
            if (branchJson) {
                let mBranch = await branchFromJSON(branchJson);
                if (mBranch) {
                    branch = mBranch;
                    exports.store.branches[branch.name] = branch;
                    saveStore();
                    await fetchRemoteBranchThreads(name);
                }
            }
            return branch;
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
    let branch = await getBranchByName(name);
    if (branch)
        branch.banned = true;
    saveStore();
}
exports.banBranch = banBranch;
async function getRemoteBranchJSON(name) {
    let qName = utils.parseQualifiedName(name);
    let remoteInstance = await getRemoteInstanceByHost(qName.host);
    if (remoteInstance && !remoteInstance.blocked) {
        return await utils.request({
            method: "GET",
            url: utils.protocol + "://" + qName.host + "/branch/" + qName.name,
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
                        await saveThread(thread);
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
    if (exists) {
        return undefined;
    }
    else {
        let branch = {
            name: name,
            description: description,
            creator: creator.name,
            sourceBranches: sourceBranches,
            pinedThreads: [],
            banned: false,
            lastUpdate: 0 // only for remote branches
        };
        exports.store.branches[branch.name] = branch;
        saveStore();
        return branch;
    }
}
exports.createBranch = createBranch;
async function isBranchAdmin(user, branch) {
    if (!user)
        return false;
    else
        return branch.creator == user.name;
}
exports.isBranchAdmin = isBranchAdmin;
async function setBranchPinedThreads(branch, pinedThreads) {
    branch.pinedThreads = pinedThreads;
}
exports.setBranchPinedThreads = setBranchPinedThreads;
async function unsafeBranchList() {
    return Object.values(exports.store.branches).filter(b => !b.banned);
}
exports.unsafeBranchList = unsafeBranchList;
// SESSION
async function getSessionById(id) {
    return exports.store.sessions[id];
}
exports.getSessionById = getSessionById;
async function createSession() {
    let session = {
        id: Math.random() * 100000000000000000 + "",
        userName: undefined,
        creationDate: new Date().toUTCString()
    };
    exports.store.sessions[session.id] = session;
    saveStore();
    return session;
}
exports.createSession = createSession;
async function deleteSession(session) {
    delete exports.store.sessions[session.id];
    saveStore();
}
exports.deleteSession = deleteSession;
async function loginSession(session, user) {
    if (user.local) {
        session.userName = user.name;
        saveStore();
    }
}
exports.loginSession = loginSession;
// ACTIVITY
async function getActivityById(id) {
    return exports.store.activitys[id];
}
exports.getActivityById = getActivityById;
async function createActivity(author, object) {
    let activity = {
        id: utils.urlForPath("activity/" + (Math.random() * 100000000000000000)),
        published: new Date().getTime(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        objectId: object.id
    };
    exports.store.activitys[activity.id] = activity;
    saveStore();
    indexActivity(activity);
    return activity;
}
exports.createActivity = createActivity;
async function getActivitysByAuthor(userName) {
    let user = await getUserByName(userName);
    if (user) {
        return (await Promise.all((indexs.userActivitys[userName] || []).map(getActivityById))).filter((x) => !!x);
    }
    else
        return undefined;
}
exports.getActivitysByAuthor = getActivitysByAuthor;
// COMMENTS
async function getCommentById(id) {
    let comment = exports.store.comments[id];
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
    if (inReplyTo.split("/")[2] != utils.serverAddress) { // send comment to remote server
        let remoteHost = utils.protocol + "://" + inReplyTo.split("/")[2] + "/inbox";
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
    exports.store.comments[comment.id] = comment;
    saveStore();
    indexComment(comment);
    return comment;
}
exports.createComment = createComment;
async function updateComment(comment, content) {
    comment.content = content;
    saveStore();
}
exports.updateComment = updateComment;
async function saveComment(comment) {
    exports.store.comments[comment.id] = comment;
    saveStore();
    indexComment(comment);
}
exports.saveComment = saveComment;
async function getCommentsByAuthor(userName) {
    let user = await getUserByName(userName);
    if (user) {
        return (await Promise.all((indexs.userComments[userName] || []).map(getCommentById))).filter((x) => !!x);
    }
    else
        return undefined;
}
exports.getCommentsByAuthor = getCommentsByAuthor;
async function adminDeleteComment(id) {
    let object = undefined;
    if (await isLocalThread(id))
        object = await getThreadById(id);
    else
        object = await getCommentById(id);
    if (object)
        object.adminDeleted = true;
    saveStore();
}
exports.adminDeleteComment = adminDeleteComment;
async function isLocalThread(id) {
    return !!exports.store.threads[id];
}
exports.isLocalThread = isLocalThread;
async function isLocalComment(id) {
    return !!exports.store.comments[id];
}
exports.isLocalComment = isLocalComment;
// THREAD
async function getThreadById(id) {
    let thread = exports.store.threads[id];
    if ((!thread || thread && new Date().getTime() - thread.lastUpdate > 1000 * 60 * 10) && !id.startsWith(utils.baseUrl)) {
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
                await saveThread(newThread);
                let { host } = urlLib.parse(newThread.id);
                await createOrUpdateLikeBundle(host, newThread, threadJson.likes);
                await Promise.all(threadJson.childrens.map(async (c) => {
                    let comment = await commentFromJSON(c);
                    if (comment) {
                        await saveComment(comment);
                        let { host } = urlLib.parse(comment.id);
                        await createOrUpdateLikeBundle(host, comment, c.likes);
                    }
                }));
                return await getThreadById(threadUrl);
            }
        })().catch(() => undefined));
    }
    if (thread && ((thread.branch && await isBranchBanned(thread.branch)) || thread.adminDeleted))
        return undefined;
    else
        return thread;
}
exports.getThreadById = getThreadById;
async function getThreadsCountForBranch(branch) {
    return (indexs.hotThreadsByBranch[branch.name] || []).length;
}
exports.getThreadsCountForBranch = getThreadsCountForBranch;
async function getThreadCommentsCount(id) {
    let tree = await getThreadCommentsForClient(undefined, id);
    if (tree) {
        function count(tree) {
            return tree.childrens.length + tree.childrens.map(c => count(c)).reduce((a, b) => a + b, 0);
        }
        return count(tree);
    }
    else
        return undefined;
}
exports.getThreadCommentsCount = getThreadCommentsCount;
async function getThreadCommentsForClient(user, id) {
    let thread = undefined;
    if (await isLocalThread(id))
        thread = await getThreadById(id);
    if (await isLocalComment(id))
        thread = await getCommentById(id);
    if (thread) {
        let childrens = await Promise.all((indexs.commentChildrens[id] || [])
            .map(url => getCommentById(url)));
        childrens = childrens.filter((c) => c);
        childrens = await Promise.all(childrens.map(async (c) => {
            let comments = await getThreadCommentsForClient(user, c.id);
            return {
                comment: c,
                childrens: (comments ? comments.childrens : []).sort((c1, c2) => c2.score - c1.score),
                score: await calculateCommentScore(c),
                liked: user ? (await hasActorLiked(user, c)) : false,
                likes: (await getLikesByObject(c)).length + await getRemoteLikesAmount(c)
            };
        }));
        return {
            comment: thread,
            childrens: childrens.sort((c1, c2) => c2.score - c1.score),
            score: await calculateCommentScore(thread),
            liked: user ? (await hasActorLiked(user, thread)) : false,
            likes: (await getLikesByObject(thread)).length + await getRemoteLikesAmount(thread)
        };
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
    utils.getUrlFromOpenGraph(content).then(media => {
        thread.media = media;
        saveStore();
    }).catch(() => { });
    await createActivity(author, thread);
    let qName = utils.parseQualifiedName(branch);
    if (!qName.isOwn) {
        let remoteHost = utils.protocol + "://" + qName.host + "/inbox";
        let jsonComment = JSON.stringify(await threadToJSON(thread));
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err, resp, body) => {
            console.log("Answer from remote inbox", err, body);
        });
    }
    exports.store.threads[thread.id] = thread;
    saveStore();
    indexComment(thread);
    indexThread(thread);
    return thread;
}
exports.createThread = createThread;
async function updateThread(thread, content) {
    thread.content = content;
    saveStore();
}
exports.updateThread = updateThread;
async function saveThread(thread) {
    exports.store.threads[thread.id] = thread;
    saveStore();
    indexComment(thread);
    indexThread(thread);
}
exports.saveThread = saveThread;
async function calculateCommentScore(comment) {
    let now = new Date().getTime();
    let published = comment.published;
    let likes = (await getLikesByObject(comment)).length + await getRemoteLikesAmount(comment);
    let age = (now - published) / 1000 / 60 / 60 / 24;
    let score = 0;
    if (age < 2)
        score = -0.5 * Math.cos(age * (Math.PI / 2)) + 0.5;
    else
        score = (-age / 6) + 4 / 3;
    return score * likes;
}
exports.calculateCommentScore = calculateCommentScore;
let pageSize = 20;
async function threadToThreadForUI(user, thread) {
    return Object.assign({}, thread, { likes: (await getLikesByObject(thread)).length + await getRemoteLikesAmount(thread), score: await calculateCommentScore(thread), position: 0, liked: user ? (await hasActorLiked(user, thread)) : false, pined: false, commentsCount: await getThreadCommentsCount(thread.id) });
}
async function getHotThreadsByBranch(branch, user, page) {
    let threads = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
        return await getThreadById(threadId);
    }))
        : (await Promise.all(Object.values(exports.store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)))).filter(th => !!th);
    let result = (await Promise.all(threads.map(async (thread, index) => {
        return await threadToThreadForUI(user, thread);
    })))
        .sort((t1, t2) => t2.score - t1.score).map((t, i) => ((t.position = i + 1), t)).splice(page * pageSize, pageSize);
    if (branch) {
        let br = await getBranchByName(branch);
        if (br) {
            result.splice(0, 0, ...(await Promise.all(br.pinedThreads.map(async (id) => {
                let th = await getThreadById(id);
                if (th) {
                    let thui = await threadToThreadForUI(user, th);
                    thui.pined = true;
                    return thui;
                }
            }))).filter(t => !!t));
        }
    }
    return result;
}
exports.getHotThreadsByBranch = getHotThreadsByBranch;
async function getTopThreadsByBranch(branch, user, page) {
    let threads = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
        return await getThreadById(threadId);
    }))
        : (await Promise.all(Object.values(exports.store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)))).filter(th => !!th);
    return (await Promise.all(threads.map(async (thread, index) => {
        return await threadToThreadForUI(user, thread);
    })))
        .sort((t1, t2) => t2.likes - t1.likes).map((t, i) => ((t.position = i + 1), t)).splice(page * pageSize, pageSize);
}
exports.getTopThreadsByBranch = getTopThreadsByBranch;
async function getNewThreadsByBranch(branch, user, page) {
    let threads = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
        return await getThreadById(threadId);
    }))
        : (await Promise.all(Object.values(exports.store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)))).filter(th => !!th);
    return (await Promise.all(threads.map(async (thread, index) => {
        return await threadToThreadForUI(user, thread);
    })))
        .sort((t1, t2) => t2.published - t1.published).map((t, i) => ((t.position = i + 1), t)).splice(page * pageSize, pageSize);
}
exports.getNewThreadsByBranch = getNewThreadsByBranch;
async function createRemoteInstance(host, name, blocked) {
    let { body } = await utils.request({
        method: "GET",
        url: utils.protocol + "://" + host + "/api/v1/instance",
        headers: { "Accept": "application/json" }
    });
    let json = JSON.parse(body);
    let remoteInstance = {
        host: host,
        name: json.title || name,
        blocked: blocked
    };
    exports.store.remoteInstances[remoteInstance.host] = remoteInstance;
    saveStore();
    return remoteInstance;
}
exports.createRemoteInstance = createRemoteInstance;
async function getRemoteInstanceByHost(host) {
    let inst = exports.store.remoteInstances[host];
    if (inst)
        return inst;
    else {
        let name = await utils.request({
            method: "GET",
            url: utils.protocol + "://" + host + "/api/v1/instance",
            headers: { "Accept": "application/json" }
        }).then(datas => {
            return JSON.parse(datas.body).title;
        });
        inst = await createRemoteInstance(host, name, utils.getBlockNewInstances());
        return inst;
    }
}
exports.getRemoteInstanceByHost = getRemoteInstanceByHost;
async function getRemoteInstances() {
    return Object.values(exports.store.remoteInstances);
}
exports.getRemoteInstances = getRemoteInstances;
async function setRemoteInstanceBlockedStatus(instance, blocked) {
    instance.blocked = blocked;
    saveStore();
}
exports.setRemoteInstanceBlockedStatus = setRemoteInstanceBlockedStatus;
