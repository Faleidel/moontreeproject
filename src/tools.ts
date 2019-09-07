import * as model from "./model";
import * as db from "./db";

async function changeSiteUrl(from: string, to: string) {
    model.loadStore(async () => {
        let threads: model.Thread[] = Object.values(model.store.threads);
        let comments: model.Comment[] = Object.values(model.store.comments);
        
        model.store.threads = {};
        model.store.comments = {};
        
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
        
        let actsQ = await db.dbPool.query(`SELECT * FROM activitys;`);
        let acts = actsQ.rows;
        acts.map((t: any) => {
            db.dbPool.connect(async (err: any, client: any, done: any) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE activitys
                        SET author = $2, object_id = $3
                        WHERE id = $1;
                    `, [t.id, t.author.replace(from, to), t.object_id.replace(from, to)]);
                    await client.query(`COMMIT`);
                    done();
                } catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
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
        
        let notificationQ = await db.dbPool.query(`SELECT * FROM notifications;`);
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
        
        let sessionsQ = await db.dbPool.query(`SELECT * FROM sessions;`);
        let sessions = userQ.rows;
        sessions.map((t: { id: string, userName: string | null }) => {
            if (t.userName) {
                db.dbPool.connect(async (err: any, client: any, done: any) => {
                    try {
                        await client.query(`BEGIN`, []);
                        await client.query(`
                            UPDATE sessions
                            SET userName = $1
                            WHERE id = $2;
                        `, [t.userName!.replace(from, to), t.id]);
                        await client.query(`COMMIT`);
                        done();
                    } catch (e) {
                        await client.query('ROLLBACK');
                        done();
                    }
                });
            }
        });
        
        let branchesQ = await db.dbPool.query(`SELECT * FROM branches;`);
        let branches = branchesQ.rows;
        branches.map((t: { creator: string, name: string }) => {
            db.dbPool.connect(async (err: any, client: any, done: any) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE branches
                        SET creator = $1
                        WHERE name = $2;
                    `, [t.creator.replace(from, to), t.name]);
                    await client.query(`COMMIT`);
                    done();
                } catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
        });
        
        let likesQ = await db.dbPool.query(`SELECT * FROM likes;`);
        let likes = likesQ.rows;
        likes.map((t: { author: string, object: string, id: string }) => {
            db.dbPool.connect(async (err: any, client: any, done: any) => {
                try {
                    await client.query(`BEGIN`, []);
                    await client.query(`
                        UPDATE likes
                        SET author = $1, object = $2
                        WHERE id = $3;
                    `, [t.author.replace(from, to), t.object.replace(from, to), t.id]);
                    await client.query(`COMMIT`);
                    done();
                } catch (e) {
                    await client.query('ROLLBACK');
                    done();
                }
            });
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