import * as utils from "./utils";

export interface Cache<Query, Item> {
    store: {[key: string]: {
        createdTime: number,
        item: Item
    }},
    queryToString: (q: Query) => string,
    fetchItem: (q: Query) => Promise<Item>, // how to fetch missing item
    expireTime: number, // time after which you can still return the store item but must refresh the cache
    invalidTime: number, // time after which the object is considered invalid and you must return a new fetched item
    cleanInterval: number, // clean invalid cache elements each n nanoseconds
    cleanIntervalId: number | undefined,
    get: (q: Query) => Promise<Item>, // how you get items
    destroy: () => void
}

export function createCache<Q, T>(
    params: {
        queryToString?: (q: Q) => string,
        fetchItem: (q: Q) => Promise<T>,
        expireTime: number,
        invalidTime: number,
        cleanInterval: number
    }
): Cache<Q, T> {
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

function destroyFunction<Q, T>(this: Cache<Q, T>): void {
    clearInterval(this.cleanIntervalId as any);
    this.store = {};
}

async function getFunction<Q, T>(this: Cache<Q, T>, query: Q): Promise<T> {
    let key = this.queryToString(query);
    let storeItem = this.store[key];
    let now = new Date().getTime();
    
    if (this.cleanIntervalId == undefined) {
        this.cleanIntervalId = setInterval(() => cleanFunction(this), this.cleanInterval) as any;
    }
    
    if (storeItem && now < (storeItem.createdTime + this.expireTime)) {
        return storeItem.item;
    } else {
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

function cleanFunction<Q, T>(cache: Cache<Q, T>): void {
    if (utils.isObjectEmpty(cache.store)) {
        clearInterval(cache.cleanIntervalId);
    } else {
        let now = new Date().getTime();
        
        Object.keys(cache.store).forEach(key => {
            let obj = cache.store[key]!;
            
            // if object expired
            if (now > obj.createdTime + cache.invalidTime) {
                delete cache.store[key];
            }
        });
    }
}
