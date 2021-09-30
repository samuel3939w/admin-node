const express = require('express')
const boom = require('boom')
const userRouter = require('./user')
const bookRouter = require('./book')
const jwtAuth = require('./jwt')
const Result = require('../models/Result')

//註冊路由
const router = express.Router()

router.use(jwtAuth)

router.get('/', (req, res) => {
    res.send('歡迎來到山姆讀書')
})

router.use('/user', userRouter)

router.use('/book', bookRouter)

/**
 * 集中處理404請求的中間件
 * 注意:該中間件必須放在正常處理流程之後
 * 否則,會攔截正常請求
 */
router.use((req, res, next) => {
    next(boom.notFound('接口不存在'))
})

/**
 * 自訂義路由異常處理中間件
 * 注意兩點:
 * 第一,方法的參數不能少
 * 第二,方法必須放在路由最後
 */
router.use((err, req, res, next) => {
    console.log(err);
    //處理token錯誤
    if (err.name && err.name === 'UnauthorizedError') {
        const { status = 401, message } = err
        new Result(null, 'Token驗證失效', {
            error: status,
            errMsg: message
        }).jwtError(res.status(status))
        //處理一般錯誤
    } else {
        const msg = (err && err.message) || '系統錯誤'
        const statusCode = (err.output && err.output.statusCode) || 500;
        const errMsg = (err.output && err.output.payload && err.output.payload.error) || err.message
        new Result(null, msg, {
            error: statusCode,
            errMsg
        }).fail(res.status(statusCode))
    }
})



module.exports = router