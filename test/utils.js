const {Builder, By, Key, until} = require('selenium-webdriver');
let fs = require('fs');

function sleep(n) {
    return new Promise((res) => setTimeout(res, n));
}
exports.sleep = sleep;

let imgPrefixs = [];
let screenCounter = 1;

function leftPad(s) {
    s = s + "";
    while (s.length < 3)
        s = "0" + s;
    return s;
}

async function screenShot(name) {
    name = name || "";
    
    let encodedString = await driver.takeScreenshot();
    fs.writeFileSync('./testsOutput/' + leftPad(screenCounter) + imgPrefixs.join("_") + name + '.png', encodedString, 'base64');
    screenCounter += 1;
}
exports.screenShot = screenShot;

let baseUrl = "https://moontreeproject.org/";
exports.baseUrl = baseUrl;

let driver = undefined;

let testStack = 0;
async function test(name, f) {
    imgPrefixs.push(name);
    testStack += 1;
    
    if (!driver)
        driver = await new Builder().forBrowser('chrome').build();
    
    let error = undefined;
    await f(driver).catch(e => {
        error = e;
    });
    
    testStack -= 1;
    
    if (testStack == 0) {
        //driver = undefined;
    }
    
    imgPrefixs.pop();
    
    if (error)
        throw(error);
}
exports.test = test;

exports.quit = function() { driver.quit() }
