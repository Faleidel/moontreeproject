"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const model = __importStar(require("./model"));
const db = __importStar(require("./db"));
async function changeSiteUrl(from, to) {
    model.loadStore(async () => {
        let threads = Object.values(model.store.threads);
        let comments = Object.values(model.store.comments);
        let acts = Object.values(model.store.activitys);
        let branches = Object.values(model.store.branches);
        let likes = Object.values(model.store.likes);
        model.store.sessions = {};
        model.store.threads = {};
        model.store.comments = {};
        model.store.activitys = {};
        model.store.branches = {};
        model.store.likes = {};
        threads.map(t => {
            t.id = t.id.replace(from, to);
            t.author = t.author.replace(from, to);
            model.store.threads[t.id] = t;
        });
        comments.map(t => {
            t.id = t.id.replace(from, to);
            t.author = t.author.replace(from, to);
            if (t.inReplyTo)
                t.inReplyTo = t.inReplyTo.replace(from, to);
            model.store.comments[t.id] = t;
        });
        acts.map(t => {
            t.id = t.id.replace(from, to);
            t.author = t.author.replace(from, to);
            t.objectId = t.objectId.replace(from, to);
            model.store.activitys[t.id] = t;
        });
        let userQ = await db.dbPool.query(`SELECT name FROM users;`);
        let users = userQ.rows;
        users.map((t) => {
            db.dbPool.connect(async (err, client, done) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE users
                        SET name = $1
                        WHERE name = $2;
                    `, [t.name.replace(from, to), t.name]);
                    await client.query(`COMMIT`);
                    done();
                }
                catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
        });
        let notificationQ = await db.dbPool.query(`SELECT name FROM notifications;`);
        let notifications = userQ.rows;
        notifications.map((t) => {
            db.dbPool.connect(async (err, client, done) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE notifications
                        SET recipient = $1
                        WHERE id = $2;
                    `, [t.recipient.replace(from, to), t.id]);
                    await client.query(`COMMIT`);
                    done();
                }
                catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
        });
        branches.map(t => {
            t.creator = t.creator.replace(from, to);
            model.store.branches[t.name] = t;
        });
        likes.map(t => {
            t.author = t.author.replace(from, to);
            t.object = t.object.replace(from, to);
            model.store.likes[t.id] = t;
        });
        model.saveStore();
    });
}
let command = process.argv[2];
if (command == "-help" || command == "-h" || command == "--help" || !command) {
    console.log("Commands:");
    console.log("    --migrate-name will migrate your data store from one site name to an other");
    console.log("    usage: --migrate-name from to (--migrate-name localhost:9090 myWebSite.com)");
}
else if (command == "--migrate-name") {
    let from = process.argv[3];
    let to = process.argv[4];
    changeSiteUrl(from, to);
}
