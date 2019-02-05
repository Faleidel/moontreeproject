import * as model from "./model";

function changeSiteUrl(from: string, to: string) {
    model.loadStore(() => {
        let threads: model.Thread[] = Object.values(model.store.threads);
        let comments: model.Comment[] = Object.values(model.store.comments);
        let acts: model.Activity[] = Object.values(model.store.activitys);
        let users: model.User[] = Object.values(model.store.users);
        let branches: model.Branch[] = Object.values(model.store.branches);
        let likes: model.Like[] = Object.values(model.store.likes);
        let notifications: model.Notification[] = Object.values(model.store.notifications);
        
        model.store.sessions = {};
        
        model.store.threads = {};
        model.store.comments = {};
        model.store.activitys = {};
        model.store.users = {};
        model.store.branches = {};
        model.store.likes = {};
        model.store.notifications = {};
        
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
        
        users.map(t => {
            t.name = t.name.replace(from, to);
            model.store.users[t.name] = t;
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
        
        notifications.map(t => {
            t.recipient = t.recipient.replace(from, to);
            model.store.notifications[t.id] = t;
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