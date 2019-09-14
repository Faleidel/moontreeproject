"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("./utils"));
function createCache(params) {
    return {
        store: {},
        queryToString: params.queryToString || ((x) => x + ""),
        fetchItem: params.fetchItem,
        expireTime: params.expireTime,
        invalidTime: params.invalidTime,
        cleanInterval: params.cleanInterval,
        get: getFunction,
        cleanIntervalId: undefined,
        destroy: destroyFunction
    };
}
exports.createCache = createCache;
function destroyFunction() {
    clearInterval(this.cleanIntervalId);
    this.store = {};
}
async function getFunction(query) {
    let key = this.queryToString(query);
    let storeItem = this.store[key];
    let now = new Date().getTime();
    if (this.cleanIntervalId == undefined) {
        this.cleanIntervalId = setInterval(() => cleanFunction(this), this.cleanInterval);
    }
    if (storeItem && now < (storeItem.createdTime + this.expireTime)) {
        return storeItem.item;
    }
    else {
        let fetching = async () => {
            let item = await this.fetchItem(query);
            this.store[key] = {
                item: item,
                createdTime: new Date().getTime()
            };
            return item;
        };
        if (storeItem) {
            fetching();
            return storeItem.item;
        }
        else
            return await fetching();
    }
}
function cleanFunction(cache) {
    if (utils.isObjectEmpty(cache.store)) {
        clearInterval(cache.cleanIntervalId);
    }
    else {
        let now = new Date().getTime();
        Object.keys(cache.store).forEach(key => {
            let obj = cache.store[key];
            // if object expired
            if (now > obj.createdTime + cache.invalidTime) {
                delete cache.store[key];
            }
        });
    }
}
