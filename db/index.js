const mysql = require('mysql')
const config = require('./config')
const { debug } = require('../utils/constant')
const { isObject } = require('../utils')

function connect() {
    return mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true
    })
}

function querySql(sql) {
    const conn = connect()
    debug && console.log(sql)
    return new Promise((resolve, reject) => {
        try {
            conn.query(sql, (err, results) => {
                if (err) {
                    //debug && console.log('查詢失敗，原因:' + JSON.stringify(err))
                    reject(err)
                } else {
                    //debug && console.log('查詢成功', JSON.stringify(results))
                    resolve(results)
                }
            })
        } catch (e) {
            reject(e)
        } finally {
            conn.end()
        }
    })
}

function queryOne(sql) {
    return new Promise((resolve, reject) => {
        querySql(sql).then(results => {
            if (results && results.length > 0) {
                resolve(results[0])
            } else {
                resolve(null)
            }
        }).catch(error => {
            reject(error)
        })
    })
}


function insert(model, tableName) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) {
            reject(new Error('插入數據庫失敗, 插入數據非對象'))
        } else {
            const keys = []
            const values = []
            Object.keys(model).forEach(key => {
                if (model.hasOwnProperty(key)) {
                    keys.push(`\`${key}\``)
                    values.push(`'${model[key]}'`)
                }
            })
            if (keys.length > 0 && values.length > 0) {
                let sql = `INSERT INTO \`${tableName}\` (`
                const keysString = keys.join(',')
                const valusString = values.join(',')
                sql = `${sql}${keysString}) VALUES(${valusString})`
                debug && console.log(sql);
                const conn = connect()
                try {
                    conn.query(sql, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                    })
                } catch (error) {
                    reject(error)
                } finally {
                    conn.end()
                }
            } else {
                reject(new Error('插入數據庫失敗, 對象中沒有任何屬性'))
            }
        }
    })

}

function update(model, tableName) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) {
            reject(new Error('插入數據庫失敗, 插入數據非對象'))
        } else {
            const entry = [];
            Object.keys(model).forEach(key => {
                if (model.hasOwnProperty(key)) {
                    entry.push(`\`${key}\`='${model[key]}'`)
                }
            })
            if (entry.length > 0) {
                const sql = `UPDATE \`${tableName}\` SET ${entry.join(',')} where fileName='${model.fileName}'`
                debug && console.log(sql);
                const conn = connect()
                try {
                    conn.query(sql, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                    })
                } catch (error) {
                    reject(error)
                } finally {
                    conn.end()
                }
            }
        }
    })
}

function and(where, k, v) {
    if (where === 'where') {
        return `${where} \`${k}\`='${v}'`
    } else {
        return `${where} and \`${k}\`='${v}'`
    }
}

function andLike(where, k, v) {
    if (where === 'where') {
        return `${where} \`${k}\` like '%${v}%'`
    } else {
        return `${where} and \`${k}\` like '%${v}%'`
    }
}

module.exports = {
    querySql,
    queryOne,
    insert,
    update,
    and,
    andLike
}