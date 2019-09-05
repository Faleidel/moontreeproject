import * as model from "./model";
import * as db from "./db";

async function changeSiteUrl(from: string, to: string) {
    model.loadStore(async () => {
        let threads: model.Thread[] = Object.values(model.store.threads);
        let comments: model.Comment[] = Object.values(model.store.comments);
        let acts: model.Activity[] = Object.values(model.store.activitys);
        let branches: model.Branch[] = Object.values(model.store.branches);
        let likes: model.Like[] = Object.values(model.store.likes);
        
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
        users.map((t: { name: string }) => {
            db.dbPool.connect(async (err: any, client: any, done: any) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE users
                        SET name = $1
                        WHERE name = $2;
                    `, [t.name.replace(from, to), t.name]);
                    await client.query(`COMMIT`);
                    done();
                } catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
        });
        
        let notificationQ = await db.dbPool.query(`SELECT name FROM notifications;`);
        let notifications = userQ.rows;
        notifications.map((t: { recipient: string, id: string }) => {
            db.dbPool.connect(async (err: any, client: any, done: any) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE notifications
                        SET recipient = $1
                        WHERE id = $2;
                    `, [t.recipient.replace(from, to), t.id]);
                    await client.query(`COMMIT`);
                    done();
                } catch (e) {
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