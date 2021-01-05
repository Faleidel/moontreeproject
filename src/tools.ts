import * as model from "./model";
import * as db from "./db";
import * as crypto from "crypto";
import readline from 'readline';
import * as utils from "./utils";

const hiddenQuestion: any = (query: string) => new Promise((resolve: any, reject: any) => {
  const rl: any = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const stdin = process.openStdin();
  process.stdin.on('data', char => {
    char = char + '';
    switch (char) {
      case '\n':
      case '\r':
      case '\u0004':
        stdin.pause();
        break;
      default:
        (process as any).stdout.clearLine();
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(query + Array(rl.line.length + 1).join('*'));
        break;
    }
  });
  rl.question(query, (value: any) => {
    rl.history = rl.history.slice(1);
    resolve(value);
  });
});

async function changeSiteUrl(from: string, to: string) {
    await model.loadStore();
//        threads.map(t => {
//            t.id = t.id.replace(from, to);
//            t.author = t.author.replace(from, to);
//            
//            model.store.threads[t.id] = t;
//        });
        
    let commentsQ = await db.dbPool.query(`SELECT * FROM comments;`);
    let comments = commentsQ.rows;
    comments.map((t: any) => {
        db.dbPool.connect(async (err: any, client: any, done: any) => {
            try {
                await client.query(`BEGIN`, []);
                await client.query(`
                    UPDATE comments
                    SET author = $2, object_id = $3, id = $4, in_reply_to = $5
                    WHERE id = $1;
                `, [ t.id
                   , t.author.replace(from, to)
                   , t.object_id.replace(from, to)
                   , t.id.replace(from, to)
                   , t.in_reply_to.replace(from, to)
                   ]);
                await client.query(`COMMIT`);
                done();
            } catch (e) {
                await client.query('ROLLBACK');
                done();
            }
        });
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
else if (command == "--reset-password") {
    let userName = process.argv[3];

    hiddenQuestion("New password?").then(async (password: string) => {
        let passwordSalt: string = await (new Promise((resolve, reject) => {
            crypto.randomBytes(512, (err, buf) => {
                if (err)
                    reject();
                else
                    resolve(buf.toString("hex") as string);
            });
        })) as string;
        let hashed = await utils.hashPassword(password, passwordSalt);

        let user = await model.getUserByName(userName);
        if (user) {
            await db.updateFieldsWhere("users", {name: user.name}, {
                passwordHashed: hashed,
                passwordSalt: passwordSalt
            });
        } else {
            console.log("Could not find user", userName);
        }
    });
}
