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
        let objectQ = await exports.dbPool.query(`SELECT * FROM ${tableName} WHERE ${utils.camelToSnakeCase(fieldName)} = $1`, [value]);
        return objectQ.rows.map((a) => utils.fromDBObject(a));
    };
}
exports.getObjectsByField = getObjectsByField;
function getAllFrom(tableName) {
    return async function () {
        return (await exports.dbPool.query(`SELECT * FROM ${tableName};`)).rows.map((obj) => utils.fromDBObject(obj));
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
        await exports.dbPool.query(sql, Object.keys(typeDefinition).map(k => a[k]));
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
    await exports.dbPool.query(sql, [].concat(...Object.values(set), ...Object.values(condition)));
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
    await exports.dbPool.query(sql, Object.values(condition));
}
exports.deleteWhere = deleteWhere;
