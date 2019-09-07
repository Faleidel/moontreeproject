const { Pool } = require('pg')
import * as utils from "./utils";

export let dbPool = undefined as any;

utils.configLoaded.then(setDbPool);

export function setDbPool() {
    dbPool = new Pool({
        user: utils.config.database.user,
        host: utils.config.database.host,
        database: utils.config.database.database,
        password: utils.config.database.password,
        port: utils.config.database.port
    });
}

export function getObjectByField<A>(tableName: string, fieldName: string): (value: any) => Promise<A | undefined> {
    let gets = getObjectsByField<A>(tableName, fieldName);
    
    return async function(value: any) {
        let objects = await gets(value);
        
        return objects[0];
    }
}

export function getObjectsByField<A>(tableName: string, fieldName: string): (value: any) => Promise<A[]> {
    return async function(value: any) {
        let objectQ = await dbPool.query(`SELECT * FROM ${tableName} WHERE ${utils.camelToSnakeCase(fieldName)} = $1`, [value]);
        
        return objectQ.rows.map((a: A) => utils.fromDBObject(a));
    }
}

export async function getObjectsWhere<A>(tableName: string, condition: any): Promise<A[]> {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i+1);
    });
    
    let objectQ = await dbPool.query(`
        SELECT * FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `, Object.values(condition));
    
    return objectQ.rows.map((r: A) => utils.fromDBObject(r))
}

export async function getObjectWhere<A>(tableName: string, cond: any): Promise<A | undefined> {
    return (await getObjectsWhere<A>(tableName, cond))[0];
}

export async function countObjectsWhere(tableName: string, condition: any): Promise<number> {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i+1);
    });
    
    let objectQ = await dbPool.query(`
        SELECT count(*) FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `, Object.values(condition));
    
    return parseInt(objectQ.rows[0].count, 10);
}

export function getAllFrom<A>(tableName: string): () => Promise<A[]> {
    return async function() {
        return (await dbPool.query(`SELECT * FROM ${tableName};`)).rows.map((obj: A) => utils.fromDBObject(obj));
    }
}

export function insertForType<A>(tableName: string, typeDefinition: any): (a: A) => Promise<void> {
    const keys = Object.keys(typeDefinition).map(k => '"'+utils.camelToSnakeCase(k)+'"').join(", ");
    const valuesInserts = Object.keys(typeDefinition).map((_, i) => "$"+(i+1)).join(", ");
    
    const sql = `
        INSERT INTO ${tableName} (${keys})
        VALUES (${valuesInserts});
    `;
    
    return async function(a: A) {
        await dbPool.query(sql, Object.keys(typeDefinition).map(k => (a as any)[k]));
    }
}

export async function updateFieldsWhere(tableName: string, condition: any, set: any): Promise<void> {
    const sets = Object.keys(set).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i+1);
    });
    
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (sets.length+i+1);
    });
    
    const sql = `
        UPDATE ${tableName}
        SET ${sets.join(", ")}
        WHERE ${conds.join(" AND ")}
    `;
    
    await dbPool.query(sql, ([] as any).concat(...Object.values(set), ...Object.values(condition)));
}

export async function deleteWhere(tableName: string, condition: any): Promise<void> {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i+1);
    });
    
    const sql = `
        DELETE FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `;
    
    await dbPool.query(sql, Object.values(condition));
}
