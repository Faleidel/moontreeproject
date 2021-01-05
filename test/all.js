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

require("./newUser").run().catch(e => {
    console.log(e);
}).then(() => {
    utils.quit();
});
