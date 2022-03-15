const express = require('express')
const multer = require('multer')
const { UPLOAD_PATH } = require('../utils/constant')
const Result = require('../models/Result')
const Book = require('../models/Book')
const boom = require('boom')
const { decode } = require('../utils')
const bookService = require('../services/book')

const router = express.Router()

//const upload=multer({ dest: `${UPLOAD_PATH}/book` })

router.post(
    '/upload', multer({ dest: `${UPLOAD_PATH}/book` }).single('file'),
    (req, res, next) => {
        if (!req.file || req.file.length === 0) {
            new Result('上傳電子書失敗').fail(res)
        } else {
            const book = new Book(req.file);
            book.parse()
                .then(book => {
                    new Result(book, '上傳電子書成功').success(res)
                }).catch(err => {
                    next(boom.badImplementation(err))
                })
        }
    }
)

router.post('/create', (req, res, next) => {
    const decoded = decode(req)
    if (decoded && decoded.username) {
        req.body.username = decoded.username
    }
    const book = new Book(null, req.body)
    bookService.insertBook(book).then(() => {
        new Result('上傳電子書成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

router.post('/update', (req, res, next) => {
    const decoded = decode(req)
    if (decoded && decoded.username) {
        req.body.username = decoded.username
    }
    const book = new Book(null, req.body)
    bookService.updateBook(book).then(() => {
        new Result('更新電子書成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

//刪除所有電子書檔案
router.post('/remove', (req, res, next) => {
    try {
        const book = new Book(null, req.body)
        bookService.removeBook(book)
        console.log("電子書刪除檔案成功");
        new Result('電子書刪除成功').success(res)
    } catch (error) {
        new Result(`刪除電子書失敗, 原因:${error}`).fail(res)
    }

    // //刪除資料夾下所有檔案的方法
    // function delDir(path) {
    //     let files = [];
    //     if (fs.existsSync(path)) {
    //         files = fs.readdirSync(path);
    //         files.forEach((file, index) => {
    //             let curPath = path + "/" + file;
    //             if (fs.statSync(curPath).isDirectory()) {
    //                 delDir(curPath); //遞迴刪除資料夾
    //             } else {
    //                 fs.unlinkSync(curPath); //刪除檔案
    //             }
    //         });
    //         fs.rmdirSync(path);
    //     }
    // }
    // try {
    //     fs.unlinkSync(`${UPLOAD_PATH}${req.body.coverPath}`)
    //     fs.unlinkSync(`${UPLOAD_PATH}${req.body.filePath}`)
    //     delDir(`${UPLOAD_PATH}${req.body.unzipPath}`)
    //     console.log("電子書刪除檔案成功");
    //     new Result('電子書刪除成功').success(res)
    // } catch (error) {
    //     new Result(`刪除電子書失敗, 原因:${error}`).fail(res)
    // }
})

router.get('/get', (req, res, next) => {
    const { fileName } = req.query
    if (!fileName) {
        next(boom.badRequest('參數fileName不能為空'))
    } else {
        bookService.getBook(fileName).then((book) => {
            new Result(book, '獲取圖書信息成功').success(res)
        }).catch(err => {
            next(boom.badImplementation(err))
        })
    }
})

router.get('/category', (req, res, next) => {
    bookService.getCategory().then(category => {
        new Result(category, '獲取分類成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

router.get('/list', (req, res, next) => {
    bookService.listBook(req.query).then(({ list, count, page, pageSize }) => {
        new Result({ list, count, page, pageSize }, '獲取圖書列表成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

router.get('/delete', (req, res, next) => {
    const { fileName } = req.query
    bookService.deleteBook(fileName).then(() => {
        new Result('刪除圖書信息成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})


module.exports = router