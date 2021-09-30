const express = require('express')
const Result = require('../models/Result')
const { login, findUser } = require('../services/user')
const { md5, decode } = require('../utils/index')
const { PWD_SALT, PRIVATE_KEY, JWT_EXPIRED } = require('../utils/constant')
const { body, validationResult } = require('express-validator')
const boom = require('boom')
const jwt = require('jsonwebtoken')

const router = express.Router()

router.post('/login',
    [
        body('username').isString().withMessage('用戶名必須為字符'),
        body('password').isString().withMessage('密碼必須為字符')
    ]
    , (req, res, next) => {
        //console.log(req.body)

        const err = validationResult(req)
        if (!err.isEmpty()) {
            const [{ msg }] = err.errors
            next(boom.badRequest(msg))
        } else {
            const username = req.body.username
            const password = md5(`${req.body.password}${PWD_SALT}`)

            login(username, password).then(user => {
                if (!user || user.length === 0) {
                    new Result('登入失敗').fail(res)
                } else {
                    const token = jwt.sign(
                        { username },
                        PRIVATE_KEY,
                        { expiresIn: JWT_EXPIRED }
                    )
                    new Result({ token }, '登入成功').success(res)
                }
            })
        }
    })

router.get('/info', (req, res) => {
    const decoded = decode(req)
    if (decoded && decoded.username) {
        findUser(decoded.username).then(user => {
            if (user) {
                user.roles = [user.role]
                new Result(user, '獲取用戶信息成功').success(res)
            } else {
                new Result('獲取用戶信息失敗').fail(res)
            }
        })
    } else {
        new Result('用戶信息解析失敗').fail(res)
    }
})

module.exports = router