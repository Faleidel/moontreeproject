const utils = require("./utils");
const fs = require('fs');
const path = require('path');

const directory = 'testsOutput';

// remove everything in testsOutput
fs.readdir(directory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(directory, file), err => {
      if (err) throw err;
    });
  }
});

(async () => {
    if (process.argv[2]) {
        await require("./" + process.argv[2]).run().catch(e => {
            console.log(e);
        }).then(() => {
            utils.quit();
        });
    } else {
        let tests = [
            "newUser",
            "branch",
            "thread",
            "comment"
        ];
        
        for (test of tests) {
            await require("./" + test).run().catch(e => {
                console.log(e);
            });
        }
        
        utils.quit();
    }
})();
