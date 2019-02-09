import * as fs from "fs";
import * as utils from "./utils";
import * as crypto from "crypto";
import * as urlLib from "url";
const request = require("request");

export interface User {
    name: string,
    passwordHashed: string,
    passwordSalt: string,
    publicKey: string,
    privateKey: string,
    banned: boolean
    
    local: boolean,
    lastUpdate: number,
    foreignUrl: string
}

export interface Notification {
    id: string,
    recipient: string,
    title: string,
    content: string,
    date: number,
    read: boolean
}

export interface Session {
    id: string,
    userName: string | undefined,
    creationDate: string
}

export interface Activity {
    id: string,
    objectId: string,
    published: string,
    author: string,
    to: string[]
}
export async function activityToJSON(act: Activity): Promise<any | undefined> {
    //let post = store.posts[act.object];
    let object: any = typeof (act as any).object == "object"
                      ? (act as any).object
                      : await getThreadById(act.objectId) || await getCommentById(act.objectId) as any as Comment;
    
    if (object) {
        return {
            "@context": [
                "https://www.w3.org/ns/activitystreams",
                "https://w3id.org/security/v1"
            ],
            id: act.id,
            type: "Create",
            to: act.to,
            cc: [object.inReplyTo],
            published: act.published,
            actor: act.author,
            object: {
                id: object.id,
                attachment: [],
                attributedTo: act.author,
                cc: [object.inReplyTo],
                title: object.title,
                content: object.content,
                published: new Date(object.published).toISOString(),
                sensitive: false,
                summary: null,
                tag: [{
                    type: "Mention",
                    href: object.inReplyTo,
                    name: "@faleidel@mastodon.social"
                }],
                to: object.to,
                type: "Note",
                url: object.id
            }
        };
    }
    else
        return undefined;
}

export interface Comment {
    id: string,
    content: string,
    published: number,
    author: string,
    to: string[],
    adminDeleted: boolean,
    inReplyTo: string | undefined // complete URL of the object. Can be an other comment or a thread
}
export async function commentToJSON(comment: Comment): Promise<any> {
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
export async function commentFromJSON(json: any): Promise<Comment | undefined> {
    return {
        id: json.id,
        content: json.content,
        published: json.published,
        author: json.attributedTo,
        to: json.to,
        inReplyTo: json.inReplyTo,
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

export interface Thread extends Comment {
    title: string,
    branch: string,
    isLink: boolean,
    media: utils.ExternalMedia | undefined,
    lastUpdate: number
}
export async function threadToJSON(thread: Thread): Promise<any> {
    return {
        ... await commentToJSON(thread),
        
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1",
            "ironTreeThread"
        ],
        
        title: thread.title,
        branch: thread.branch.indexOf("@") == -1 ? thread.branch + "@" + utils.serverAddress : thread.branch.split("@")[0],
        isLink: thread.isLink,
        media: thread.media,
        likes: await getRemoteLikesAmount(thread) + (await getLikesByObject(thread)).length
    };
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
    position: number,
    commentsCount: number,
    likes: number,
    score: number,
    pined: boolean,
    liked: boolean
}

export interface Branch {
    name: string,
    creator: string,
    description: string,
    sourceBranches: string[],
    pinedThreads: string[],
    banned: boolean,
    
    lastUpdate: number
}
export async function branchToJSON(branch: Branch): Promise<any> {
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        type: "OrderedCollection",
        first: utils.urlForPath("branch/" + branch.name + "?page=0"),
        last: utils.urlForPath("branch/" + branch.name + "?page=10000"), // TODO
        id: utils.urlForPath("branch/" + branch.name),
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
        banned: false
    };
}

export interface RemoteInstance {
    host: string,
    name: string,
    blocked: boolean
}

export interface Like {
    id: string,
    author: string,
    object: string
}

export interface LikeBundle {
    server: string,
    object: string,
    amount: number
}

export let store = {
    users: {} as {[name: string]: User},
    sessions: {} as {[id: string]: Session},
    activitys: {} as {[id: string]: Activity},
    comments: {} as {[id: string]: Comment},
    threads: {} as {[id: string]: Thread},
    branches: {} as {[id: string]: Branch},
    likes: {} as {[id: string]: Like},
    likeBundles: {} as {[id: string]: LikeBundle}, // id is object.id + server name
    remoteInstances: {} as {[host: string]: RemoteInstance},
    notifications: {} as {[id: string]: Notification}
};

let indexs = {
    commentChildrens: {} as {[id: string]: string[]},
    userComments: {} as {[id: string]: string[]},
    userActivitys: {} as {[id: string]: string[]},
    hotThreadsByBranch: {} as {[id: string]: string[]},
    likesByObject: {} as {[id: string]: string[]},
    likeOfActorOnObject: {} as {[id: string]: Like},
    likeBundlesByObject: {} as {[object: string]: string[]},
    branchesBySource: {} as {[name: string]: Branch[]},
    notificationsByUser: {} as {[name: string]: string[]}
};
function addToIndex(indexName: string, key: string, value: string) {
    let list = (indexs as any)[indexName][key];
    
    if (!list) {
        list = [];
        (indexs as any)[indexName][key] = list;
    }
    
    list.push(value);
}
function indexComment(comment: Comment): void {
    if (!indexs.userComments[comment.author] || !indexs.userComments[comment.author].find(c => c == comment.id))
        addToIndex("userComments", comment.author, comment.id);
    
    if (comment.inReplyTo && (!indexs.commentChildrens[comment.inReplyTo] || !indexs.commentChildrens[comment.inReplyTo].find(c => c == comment.id)))
        addToIndex("commentChildrens", comment.inReplyTo, comment.id);
}
function indexThread(thread: Thread): void {
    if (!indexs.hotThreadsByBranch[thread.branch] || !indexs.hotThreadsByBranch[thread.branch].find(c => c == thread.id))
        addToIndex("hotThreadsByBranch", thread.branch, thread.id);
}
function indexActivity(activity: Activity): void {
    addToIndex("userActivitys", activity.author, activity.id);
}
function indexLike(like: Like): void {
    addToIndex("likesByObject", like.object, like.id);
    indexs.likeOfActorOnObject[like.author + like.object] = like;
}
function unindexLike(like: Like): void {
    let likeList = indexs.likesByObject[like.object];
    for (let i = 0 ; i < likeList.length ; i++) {
        if (likeList[i] == like.id) {
            likeList.splice(i, 1);
        }
    }
    
    delete indexs.likeOfActorOnObject[like.author + like.object];
}
function indexLikeBundle(likeBundle: LikeBundle): void {
    addToIndex("likeBundlesByObject", likeBundle.object, likeBundle.object + likeBundle.server);
}
function indexNotification(notification: Notification): void {
    addToIndex("notificationsByUser", notification.recipient, notification.id);
}

async function testLikeOn(comment: Comment, amount: number): Promise<void> {
    for (let i = 0 ; i < amount ; i++) {
        let user = await getUserByName("test"+i+"@"+utils.serverAddress);
        
        if (user) {
            let l = await createLike(user, comment);
            console.log(l);
        } else {
            console.log("bad user");
        }
    }
}

export function loadStore(cb: any): void {
    fs.readFile("store.json", "utf-8", (err, data) => {
        if (data) {
            console.log("Got store");
            store = JSON.parse(data);
            
            Object.values(store.comments).map(c => indexComment(c));
            Object.values(store.threads).map(t => indexComment(t));
            Object.values(store.threads).map(t => indexThread(t));
            Object.values(store.activitys).map(t => indexActivity(t));
            Object.values(store.likes).map(t => indexLike(t));
            Object.values(store.likeBundles).map(t => indexLikeBundle(t));
            Object.values(store.notifications).map(t => indexNotification(t));
        } else {
            console.log("Got no store");
            (async () => {
                if (utils.generateTestData) {
                    console.log("Generating test datas");
                    
                    let admin = await createUser("admin", "admin") as any;
                    let admin2  = await createUser("admin2", "admin2") as any;
                    
                    utils.setAdmins(["admin@"+utils.serverAddress, "admin2@"+utils.serverAddress]);
                    
                    for (let i = 0 ; i < 20 ; i++)
                        await createUser("test" + i, "test" + i);
                    
                    await createBranch("gold", "This is the gold branch", [], admin);
                    await createBranch("silver", "This is the silver branch", [], admin2);
                    await createBranch("iron", "This is the iron branch", [], await getUserByName("test1@"+utils.serverAddress) as any);
                    await createBranch("test", "This is the test branch", [], admin);
                    
                    let randomBranch = () => ["gold", "silver", "iron"][Math.floor(Math.random()*3)];
                    
                    for (let i = 0 ; i < 200 ; i++) {
                        let thread = await createThread(admin, "test thread" + i, "With no content", randomBranch());
                        thread.published -= 1000 * 60 * 60 * 24 * 5 * Math.random();
                    }
                    
                    await (async () => {
                        for (let tid in store.threads) {
                            let c = await getThreadById(tid);
                            if (c)
                                await testLikeOn(c, Math.floor(Math.random()*20));
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
export async function createLike(author: User, object: Comment): Promise<Like | undefined> {
    let likesOfObject = await getLikesByObject(object);
    
    let alreadyLiked = likesOfObject.some(l => l.author == author.name);
    
    if (alreadyLiked) {
        return undefined;
    } else {
        let like: Like = {
            id: Math.random() * 100000000000000000 + "",
            author: author.name,
            object: object.id
        };
        
        store.likes[like.id] = like;
        
        indexLike(like);
        saveStore();
        
        return like;
    }
}
export async function deleteLikeOfOn(actor: User, object: Comment): Promise<void> {
    let indexKey = actor.name + object.id;
    
    let like = indexs.likeOfActorOnObject[indexKey];
    
    if (like) {
        delete store.likes[like.id];
        unindexLike(like);
    }
    
    saveStore();
}
export async function getLikeById(id: string): Promise<Like | undefined> {
    return store.likes[id];
}
export async function getLikesByObject(object: Comment): Promise<Like[]> {
    return (await Promise.all((indexs.likesByObject[object.id] || []).map(getLikeById))).filter((x): x is Like => !!x);
}
export async function hasActorLiked(actor: User, object: Comment): Promise<boolean> {
    return !!indexs.likeOfActorOnObject[actor.name + object.id];
}
export async function createOrUpdateLikeBundle(server: string, object: Comment, amount: number): Promise<LikeBundle | undefined> {
    let pastBundle = store.likeBundles[object.id + server];
    
    if (pastBundle) {
        pastBundle.amount = amount;
        saveStore();
    } else {
        let bundle: LikeBundle = {
            server: server,
            object: object.id,
            amount: amount
        };
        
        store.likeBundles[bundle.object + bundle.server] = bundle;
        indexLikeBundle(bundle);
        saveStore();
        
        return bundle;
    }
}
export async function getLikeBundleById(id: string): Promise<LikeBundle | undefined> {
    return store.likeBundles[id];
}
export async function getRemoteLikesAmount(object: Comment): Promise<number> {
    let bundles = (await Promise.all(
        (indexs.likeBundlesByObject[object.id] || [])
        .map(async (id: string) => await getLikeBundleById(id))
    )).filter(e => !!e) as LikeBundle[];
    return bundles.reduce((acc, bundle) => acc + bundle.amount, 0);
}

// USER
export async function getUserByName(name: string): Promise<User | undefined> {
    let user = store.users[name];
    
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
        if (name.indexOf("@" + utils.serverAddress) == -1) {
            console.log("GET NEW FOREIGN USER");
            return await getForeignUser(name);
        }
        else
            return undefined;
    }
}
export async function getUserList(): Promise<User[]> {
    return Object.values(store.users);
}
export async function getForeignUser(name: string): Promise<User | undefined> {
    let domain = name.split("@")[1];
    
    let remoteInstance = await getRemoteInstanceByHost(domain);
    
    if (remoteInstance && !remoteInstance.blocked) {
        let userLink: string = await utils.request({
            methode: "GET",
            url: utils.protocol + "://" + domain + "/.well-known/webfinger?resource=acct:" + name,
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
        
        store.users[name] = newUser;
        saveStore();
        
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
                    published: act.object.published,
                    author: name,
                    to: act.object.to,
                    inReplyTo: act.object.inReplyTo,
                    adminDeleted: false
                };
                
                let activity: Activity = {
                    id: act.id,
                    objectId: act.object.id,
                    published: act.published,
                    author: name,
                    to: act.to
                };
                
                store.comments[comment.id] = comment;
                store.activitys[activity.id] = activity;
                
                indexComment(comment);
                indexActivity(activity);
                
                saveStore();
            }
        })
    }
}
export async function createUser(name: string, password: string): Promise<User | undefined> {
    name = name + "@" + utils.serverAddress;
    
    let user = await getUserByName(name);
    
    // Can't create the user if it already exists
    if (!user) {
        let passwordSalt: string = await (new Promise((resolve, reject) => {
            crypto.randomBytes(512, (err, buf) => {
                if (err)
                    reject();
                else
                    resolve(buf.toString("hex") as string);
            });
        })) as string;
        let passwordHashed = await utils.hashPassword(password, passwordSalt);
        
        let u = await utils.generateUserKeyPair().then(kp => {
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
            
            store.users[name] = user;
            saveStore();
            
            console.log("MADE USER");
            
            return user;
        });
        
        console.log("RETURN USER",u);
        
        return u;
    }
    else {
        console.log("USER EXISTS");
        return Promise.resolve(undefined);
    }
}
export async function banUser(name: string): Promise<void> {
    let user = await getUserByName(name);
    
    if (user) {
        user.banned = true;
        Object.values(store.sessions).map(session => {
            if (session.userName == name) {
                session.userName = undefined;
            }
        });
        saveStore();
    }
}

// NOTIFICATION
export async function createNotification(recipient: User, title: string, content: string): Promise<Notification> {
    let notif = {
        id: Math.random() * 100000000000000000 + "",
        recipient: recipient.name,
        title: title,
        content: content,
        date: new Date().getTime(),
        read: false
    }
    
    store.notifications[notif.id] = notif;
    indexNotification(notif);
    saveStore();
    
    return notif;
}
export async function getNotificationsById(id: string): Promise<Notification | undefined> {
    return store.notifications[id];
}
export async function getNotificationsByUser(recipient: User): Promise<Notification[]> {
    let ids = indexs.notificationsByUser[recipient.name] || [];
    let notifs = (await Promise.all(ids.map(id => getNotificationsById(id)))).filter(n => !!n) as Notification[];
    return notifs.sort((n1, n2) => n2.date - n1.date);
}
export async function getNotificationCountByUser(recipient: User): Promise<number> {
    return (await getNotificationsByUser(recipient)).filter(n => !n.read).length;
}
export async function setNotificationRead(notification: Notification): Promise<void> {
    notification.read = true;
    saveStore();
}

// BRANCH
export async function getBranchByName(name: string): Promise<Branch | undefined> {
    let branch = store.branches[name];
    let qName = utils.parseQualifiedName(name);
    
    if (!branch) {
        if (!qName.isOwn) {
            let branchJson = await getRemoteBranchJSON(name);
            
            if (branchJson) {
                let mBranch = await branchFromJSON(branchJson);
                
                if (mBranch) {
                    branch = mBranch;
                    store.branches[branch.name] = branch;
                    saveStore();
                    
                    await fetchRemoteBranchThreads(name);
                }
            }
            
            return branch;
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
    let branch = await getBranchByName(name);
    if (branch)
        branch.banned = true;
    saveStore();
}
export async function getRemoteBranchJSON(name: string): Promise<any | undefined> {
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
                        await saveThread(thread);
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
    
    if (exists) {
        return undefined;
    } else {
        let branch: Branch = {
            name: name,
            description: description,
            creator: creator.name,
            sourceBranches: sourceBranches,
            pinedThreads: [],
            banned: false,
            
            lastUpdate: 0 // only for remote branches
        };
        
        store.branches[branch.name] = branch;
        saveStore();
        
        return branch;
    }
}
export async function isBranchAdmin(user: User | undefined, branch: Branch): Promise<boolean> {
    if (!user)
        return false;
    else
        return branch.creator == user.name;
}
export async function setBranchPinedThreads(branch: Branch, pinedThreads: string[]): Promise<void> {
    branch.pinedThreads = pinedThreads;
}
export async function unsafeBranchList(): Promise<Branch[]> {
    return Object.values(store.branches).filter(b => !b.banned);
}

// SESSION
export async function getSessionById(id: string): Promise<Session | undefined> {
    return store.sessions[id];
}
export async function createSession(): Promise<Session> {
    let session: Session = {
        id: Math.random() * 100000000000000000 + "",
        userName: undefined,
        creationDate: new Date().toUTCString()
    };
    
    store.sessions[session.id] = session;
    saveStore();
    
    return session;
}
export async function deleteSession(session: Session): Promise<void> {
    delete store.sessions[session.id];
    saveStore();
}
export async function loginSession(session: Session, user: User): Promise<void> {
    if (user.local) {
        session.userName = user.name;
        saveStore();
    }
}

// ACTIVITY
export async function getActivityById(id: string): Promise<Activity | undefined> {
    return store.activitys[id];
}
export async function createActivity(author: User, object: Comment): Promise<Activity> {
    let activity: Activity = {
        id: utils.urlForPath("activity/" + (Math.random() * 100000000000000000)),
        published: new Date().toISOString(),
        author: author.name,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        objectId: object.id
    }
    
    store.activitys[activity.id] = activity;
    saveStore();
    indexActivity(activity);
    
    return activity;
}
export async function getActivitysByAuthor(userName: string): Promise<Activity[] | undefined> {
    let user = await getUserByName(userName);
    
    if (user) {
        return (await Promise.all((indexs.userActivitys[userName] || []).map(getActivityById))).filter((x): x is Activity => !!x);
    }
    else
        return undefined;
}

// COMMENTS
export async function getCommentById(id: string): Promise<Comment | undefined> {
    let comment = store.comments[id];
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
        adminDeleted: false
    }
    
    if (inReplyTo.split("/")[2] != utils.serverAddress) { // send comment to remote server
        let remoteHost = utils.protocol + "://" + inReplyTo.split("/")[2] + "/inbox";
        
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
    
    store.comments[comment.id] = comment;
    saveStore();
    indexComment(comment);
    
    return comment;
}
export async function updateComment(comment: Comment, content: string): Promise<void> {
    comment.content = content;
    saveStore();
}
export async function saveComment(comment: Comment): Promise<void> {
    store.comments[comment.id] = comment;
    saveStore();
    indexComment(comment);
}
export async function getCommentsByAuthor(userName: string): Promise<Comment[] | undefined> {
    let user = await getUserByName(userName);
    
    if (user) {
        return (await Promise.all((indexs.userComments[userName] || []).map(getCommentById))).filter((x): x is Comment => !!x);
    }
    else
        return undefined;
}
export async function adminDeleteComment(id: string): Promise<void> {
    let object = undefined;
    if (await isLocalThread(id))
        object = await getThreadById(id);
    else
        object = await getCommentById(id);
    
    if (object)
        object.adminDeleted = true;
    
    saveStore();
}
export async function isLocalThread(id: string): Promise<boolean> {
    return !!store.threads[id];
}
export async function isLocalComment(id: string): Promise<boolean> {
    return !!store.comments[id];
}
// THREAD
export async function getThreadById(id: string): Promise<Thread | undefined> {
    let thread: Thread | undefined = store.threads[id];
    
    if ((!thread || thread && new Date().getTime()-thread.lastUpdate > 1000*60*10) && !id.startsWith(utils.baseUrl)) {
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
                await saveThread(newThread);
                
                let {host} = urlLib.parse(newThread.id) as any;
                await createOrUpdateLikeBundle(host, newThread, threadJson.likes);
                
                await Promise.all(threadJson.childrens.map(async (c: any) => {
                    let comment = await commentFromJSON(c);
                    if (comment) {
                        await saveComment(comment);
                        let {host} = urlLib.parse(comment.id) as any;
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
export async function getThreadsCountForBranch(branch: Branch): Promise<number> {
    return (indexs.hotThreadsByBranch[branch.name] || []).length;
}
export async function getThreadCommentsCount(id: string): Promise<number | undefined> {
    let tree = await getThreadCommentsForClient(undefined, id);
    
    if (tree) {
        function count(tree: CommentTree): number{
            return tree.childrens.length + tree.childrens.map(c => count(c)).reduce((a,b) => a + b, 0)
        }
        return count(tree);
    }
    else
        return undefined;
}
export async function getThreadCommentsForClient(user: User | undefined, id: string): Promise<CommentTree | undefined> {
    let thread: any = undefined;
    
    if (await isLocalThread(id))
        thread = await getThreadById(id);
    if (await isLocalComment(id))
        thread = await getCommentById(id);
    
    if (thread) {
        let childrens: any = await Promise.all((indexs.commentChildrens[id] || [])
                                               .map(url => getCommentById(url))
                                              );
        
        childrens = childrens.filter((c: any) => c);
        childrens = await Promise.all(childrens.map(async (c: any): Promise<CommentTree> => {
            let comments = await getThreadCommentsForClient(user ,(c as any).id);
            
            return {
                comment: c as Comment,
                childrens: (comments ? comments.childrens : []).sort((c1, c2) => c2.score - c1.score),
                score: await calculateCommentScore(c as Comment),
                liked: user ? (await hasActorLiked(user, c as Comment)) : false,
                likes: (await getLikesByObject(c as Comment)).length + await getRemoteLikesAmount(c as Comment)
            }
        }));
        
        return {
            comment: thread,
            childrens: childrens.sort((c1: any, c2: any) => c2.score - c1.score),
            score: await calculateCommentScore(thread),
            liked: user ? (await hasActorLiked(user, thread)) : false,
            likes: (await getLikesByObject(thread)).length + await getRemoteLikesAmount(thread)
        };
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
export async function createThread(author: User, title: string, content: string, branch: string): Promise<Thread> {
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
        
        lastUpdate: 0
    }
    
    utils.getUrlFromOpenGraph(content).then(media => {
        thread.media = media;
        saveStore();
    }).catch(() => {});
    
    await createActivity(author, thread);
    
    let qName = utils.parseQualifiedName(branch);
    if (!qName.isOwn) {
        let remoteHost = utils.protocol + "://" + qName.host + "/inbox";
        
        let jsonComment = JSON.stringify(await threadToJSON(thread));
        
        request.post({
            url: remoteHost,
            body: jsonComment
        }, (err: any, resp: any, body: any) => {
            console.log("Answer from remote inbox", err, body);
        });
    }
    
    store.threads[thread.id] = thread;
    saveStore();
    indexComment(thread);
    indexThread(thread);
    
    return thread;
}
export async function updateThread(thread: Thread, content: string): Promise<void> {
   thread.content = content;
   saveStore();
}
export async function saveThread(thread: Thread): Promise<void> {
    store.threads[thread.id] = thread;
    saveStore();
    indexComment(thread);
    indexThread(thread);
}
export async function calculateCommentScore(comment: Comment): Promise<number> {
    let now = new Date().getTime();
    let published = comment.published;
    let likes = (await getLikesByObject(comment)).length + await getRemoteLikesAmount(comment);
    
    let age = (now - published) / 1000 / 60 / 60 / 24;
    
    let score = 0;
    
    if (age < 2)
        score = -0.5 * Math.cos(age * (Math.PI / 2)) + 0.5;
    else
        score = (-age / 6) + 4/3;
    
    return score * likes;
}
let pageSize = 20;
async function threadToThreadForUI(user: User | undefined, thread: Thread): Promise<ThreadForUI> {
    return {
        ...thread,
        likes: (await getLikesByObject(thread)).length + await getRemoteLikesAmount(thread),
        score: await calculateCommentScore(thread),
        position: 0,
        liked: user ? (await hasActorLiked(user, thread)) : false,
        pined: false,
        commentsCount: await getThreadCommentsCount(thread.id) as number
    };
}
export async function getHotThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
    let threads: Thread[] = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
                                         return await getThreadById(threadId) as Thread;
                                     }))
                                   : (await Promise.all(
                                         Object.values(store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)
                                     ))
                            ).filter(th => !!th) as Thread[];
    
    let result = (await Promise.all(threads.map(async (thread, index) => {
                     return await threadToThreadForUI(user, thread)
                 })))
                 .sort((t1, t2) => t2.score - t1.score).map((t, i) => ((t.position = i+1), t)).splice(page*pageSize, pageSize);
    
    if (branch) {
        let br = await getBranchByName(branch);
        
        if (br) {
            result.splice(0, 0, ...(await Promise.all(br.pinedThreads.map(async (id: string) => {
                let th = await getThreadById(id);
                if (th) {
                    let thui = await threadToThreadForUI(user, th);
                    thui.pined = true;
                    return thui;
                }
            }))).filter(t => !!t) as ThreadForUI[]);
        }
    }
    
    return result;
}

export async function getTopThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
    let threads: Thread[] = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
                                         return await getThreadById(threadId) as Thread;
                                     }))
                                   : (await Promise.all(
                                         Object.values(store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)
                                     ))
                            ).filter(th => !!th) as Thread[];
    
    return (await Promise.all(threads.map(async (thread, index) => {
                 return await threadToThreadForUI(user, thread);
           })))
           .sort((t1, t2) => t2.likes - t1.likes).map((t, i) => ((t.position = i+1), t)).splice(page*pageSize, pageSize);
}

export async function getNewThreadsByBranch(branch: string | undefined, user: User | undefined, page: number): Promise<ThreadForUI[]> {
    let threads: Thread[] = (branch ? await Promise.all((indexs.hotThreadsByBranch[branch] || []).map(async (threadId, index) => {
                                         return await getThreadById(threadId) as Thread;
                                     }))
                                   : (await Promise.all(
                                         Object.values(store.threads).map(async (th) => !(await getThreadById(th.id)) ? undefined : th)
                                     ))
                            ).filter(th => !!th) as Thread[];
    
    return (await Promise.all(threads.map(async (thread, index) => {
                 return await threadToThreadForUI(user, thread);
           })))
           .sort((t1, t2) => t2.published - t1.published).map((t, i) => ((t.position = i+1), t)).splice(page*pageSize, pageSize);
}

export async function createRemoteInstance(host: string, name: string, blocked: boolean): Promise<RemoteInstance | undefined> {
    let {body} = await utils.request({
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
    
    store.remoteInstances[remoteInstance.host] = remoteInstance;
    saveStore();
    
    return remoteInstance;
}
export async function getRemoteInstanceByHost(host: string): Promise<RemoteInstance | undefined> {
    let inst = store.remoteInstances[host] as RemoteInstance | undefined;
    
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
export async function getRemoteInstances(): Promise<RemoteInstance[]> {
    return Object.values(store.remoteInstances);
}
export async function setRemoteInstanceBlockedStatus(instance: RemoteInstance, blocked: boolean) {
    instance.blocked = blocked;
    saveStore();
}
