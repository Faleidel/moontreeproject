"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const { Pool } = require('pg');
const utils = __importStar(require("./utils"));
const modelInterfaces_1 = require("./modelInterfaces");
exports.dbPool = undefined;
utils.configLoaded.then(setDbPool);
function setDbPool() {
    exports.dbPool = new Pool({
        user: utils.config.database.user,
        host: utils.config.database.host,
        database: utils.config.database.database,
        password: utils.config.database.password,
        port: utils.config.database.port
    });
}
exports.setDbPool = setDbPool;
function query(sql, params = []) {
    return exports.dbPool.query(sql, params)
        .catch((e) => {
        console.log("Query error", e, sql, params);
        throw (new Error("Query error"));
    });
}
exports.query = query;
function fromDBObject(obj, definition) {
    if (!obj)
        return obj;
    let r = {};
    Object.keys(obj).map(key => {
        let value = obj[key];
        let realKey = utils.snakeToCamelCase(key);
        // sometimes there are extra keys not in the definition so `definition[realKey].tsType` could crash
        if (definition[realKey] && definition[realKey].tsType == "number") {
            value = parseInt(value, 10);
        }
        r[realKey] = value;
    });
    return r;
}
exports.fromDBObject = fromDBObject;
function getObjectByField(tableName, fieldName) {
    let gets = getObjectsByField(tableName, fieldName);
    return async function (value) {
        let objects = await gets(value);
        return objects[0];
    };
}
exports.getObjectByField = getObjectByField;
function getObjectsByField(tableName, fieldName) {
    return async function (value) {
        let objectQ = await query(`SELECT * FROM ${tableName} WHERE ${utils.camelToSnakeCase(fieldName)} = $1`, [value]);
        return objectQ.rows.map((a) => fromDBObject(a, modelInterfaces_1.tableMap[tableName].definition));
    };
}
exports.getObjectsByField = getObjectsByField;
async function getObjectsWhere(tableName, condition) {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i + 1);
    });
    let objectQ = await query(`
        SELECT * FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `, Object.values(condition));
    return objectQ.rows.map((r) => fromDBObject(r, modelInterfaces_1.tableMap[tableName].definition));
}
exports.getObjectsWhere = getObjectsWhere;
async function getObjectWhere(tableName, cond) {
    return (await getObjectsWhere(tableName, cond))[0];
}
exports.getObjectWhere = getObjectWhere;
async function countObjectsWhere(tableName, condition) {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i + 1);
    });
    let objectQ = await query(`
        SELECT count(*) FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `, Object.values(condition));
    return parseInt(objectQ.rows[0].count, 10);
}
exports.countObjectsWhere = countObjectsWhere;
function getAllFrom(tableName) {
    return async function () {
        return (await query(`SELECT * FROM ${tableName};`)).rows.map((obj) => fromDBObject(obj, modelInterfaces_1.tableMap[tableName].definition));
    };
}
exports.getAllFrom = getAllFrom;
function insertForType(tableName, typeDefinition) {
    const keys = Object.keys(typeDefinition).map(k => '"' + utils.camelToSnakeCase(k) + '"').join(", ");
    const valuesInserts = Object.keys(typeDefinition).map((_, i) => "$" + (i + 1)).join(", ");
    const sql = `
        INSERT INTO ${tableName} (${keys})
        VALUES (${valuesInserts});
    `;
    return async function (a) {
        await query(sql, Object.keys(typeDefinition).map(k => {
            let infos = typeDefinition[k];
            if (infos.dbType == "json")
                return JSON.stringify(a[k]);
            else
                return a[k];
        }));
    };
}
exports.insertForType = insertForType;
async function updateFieldsWhere(tableName, condition, set) {
    const sets = Object.keys(set).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i + 1);
    });
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (sets.length + i + 1);
    });
    const sql = `
        UPDATE ${tableName}
        SET ${sets.join(", ")}
        WHERE ${conds.join(" AND ")}
    `;
    await query(sql, [].concat(...Object.values(set), ...Object.values(condition)));
}
exports.updateFieldsWhere = updateFieldsWhere;
async function deleteWhere(tableName, condition) {
    const conds = Object.keys(condition).map((key, i) => {
        return utils.camelToSnakeCase(key) + " = $" + (i + 1);
    });
    const sql = `
        DELETE FROM ${tableName}
        WHERE ${conds.join(" AND ")}
    `;
    await query(sql, Object.values(condition));
}
exports.deleteWhere = deleteWhere;
