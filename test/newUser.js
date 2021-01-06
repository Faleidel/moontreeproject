const { Builder, By, Key, until } = require('selenium-webdriver');
let utils = require("./utils");

let testUser = {};
exports.testUser = testUser;

// login as a random user
async function baseLogin() {
    await utils.test("base login", async driver => {
        let hasLogout = await driver.findElements(By.id("logout"));
        if (hasLogout.length == 0) {
            // ok, not logged
        } else {
            await hasLogout[0].click();
            await utils.sleep(100);
        }
        
        if (!testUser.name) {
            testUser.name = "testUser" + Math.random();
            testUser.password = "testUser" + Math.random();
            
            await createUser(testUser.name, testUser.password);
        }
        
        await login(testUser.name, testUser.password);
    });
}
exports.baseLogin = baseLogin;

async function login(user, password, logs = false) {
    await utils.test("login", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // click login
        let loginLink = await driver.findElement(By.id("login"));
        await loginLink.click();
        
        if (logs) {
            await utils.sleep(100);
            await utils.screenShot();
        }
        
        // enter user name
        let userInput = await driver.findElement(By.css('[type="user"][name="user"]'));
        await userInput.sendKeys(user);
        
        if (logs)
            await utils.screenShot();
        
        // enter password
        let passwordInput = await driver.findElement(By.css('[type="password"][name="password"]'));
        await passwordInput.sendKeys(password);
        
        // click login
        (await driver.findElement(By.css('[type="submit"][value="Login"]'))).click();
        await utils.sleep(100);
        
        let hasLogout = await driver.findElements(By.id("logout"));
        if (hasLogout.length == 0) {
            await utils.screenShot("_error");
            throw new Error("Loggin didn't work.");
        }
    });
}
exports.login = login;

async function logout(driver) {
    await utils.test("logout", async driver => {
        let hasLogout = await driver.findElements(By.id("logout"));
        
        if (hasLogout.length != 0)
            await hasLogout[0].click();
    });
}
exports.logout = logout;

async function createUser(user, password) {
    await utils.test("signup", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // click login
        let signupLink = await driver.findElement(By.id("signup"));
        await signupLink.click();
        
        await utils.sleep(100);
        await utils.screenShot();
        
        // enter user name
        let userInput = await driver.findElement(By.css('[type="user"][name="user"]'));
        await userInput.sendKeys(user);
        await utils.screenShot();
        
        // enter password
        let passwordInput = await driver.findElement(By.css('[type="password"][name="password"]'));
        await passwordInput.sendKeys(password);
        let passwordInput2 = await driver.findElement(By.css('[type="password"][name="password2"]'));
        await passwordInput2.sendKeys(password);
        
        // click login
        (await driver.findElement(By.css('[type="submit"][value="Create"]'))).click();
        await utils.sleep(100);
        
        await utils.screenShot();
        
        let hasLogout = await driver.findElements(By.id("logout"));
        if (hasLogout.length == 0) {
            await utils.screenShot("_error");
            throw new Error("Loggin didn't work.");
        } else {
            await hasLogout[0].click();
        }
    });
}

exports.run = async function() {
    await utils.test("Run newUser", async driver => {
        await baseLogin();
        await logout();
        
        await login(testUser.name, testUser.password, true);
        
        await logout();
    });
}
